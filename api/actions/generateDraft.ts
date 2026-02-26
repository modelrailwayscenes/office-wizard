// api/actions/generateDraft.ts

import type { ActionOptions } from "gadget-server";
import Anthropic from "@anthropic-ai/sdk";

type PlaybookSignal = {
  id?: string;
  type?: string;
  pattern?: string;
  hint?: string;
};

const safeJsonParseArray = <T = any>(raw: unknown): T[] => {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const toScenarioKey = (record: any): string => {
  const explicit = String(record?.scenarioKey || "").trim();
  if (explicit) return explicit;
  return String(record?.name || "playbook")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
};

const evaluateSignal = (signal: PlaybookSignal, context: { searchableText: string; orderId: string | null }) => {
  const signalType = (signal.type || "").toLowerCase();
  const hint = String(signal.hint || "").toLowerCase();
  const pattern = String(signal.pattern || "");

  if (signalType === "regex" && pattern) {
    try {
      const re = new RegExp(pattern, "i");
      return re.test(context.searchableText);
    } catch {
      return false;
    }
  }

  if (signalType === "heuristic") {
    if (String(signal.id || "").includes("order") || hint.includes("order")) return Boolean(context.orderId);
    if (String(signal.id || "").includes("time_since_delivery")) return false;
  }

  const keywords = hint
    .split(/[,/]| and | or /g)
    .map((k) => k.trim())
    .filter((k) => k.length >= 3);
  if (keywords.length === 0) return false;
  return keywords.some((kw) => context.searchableText.includes(kw));
};

// ---------------------------------------------------------------------------
// generateDraft
//
// Generates an AI-powered email response using Claude API.
// Takes conversation context and creates a professional, contextual reply.
// Also writes an aiComment audit trail record (aiComment model).
// ---------------------------------------------------------------------------

export const run: ActionRun = async ({ logger, api, params, connections, session }) => {
  const { conversationId, regenerate } = params as any;
  if (!conversationId) throw new Error("conversationId is required");

  const userRef = session?.get("user");
  const actorUserId =
    typeof userRef === "string" ? userRef : userRef?._link || userRef?.id || null;
  const auditSource = session ? "admin_ui" : "system";

  logger.info({ conversationId, regenerate }, "Starting draft generation");

  // Load app configuration for API key
  const config = await api.appConfiguration.findFirst({
    select: { anthropicApiKey: true, draftInstructions: true } as any,
  });

  const apiKey = (config as any)?.anthropicApiKey;
  if (!apiKey) {
    throw new Error("Anthropic API key not configured. Please add it in Settings > AI & Automation.");
  }

  // Load conversation with all context
  const convRecords = await api.conversation.findMany({
    filter: { id: { equals: conversationId } } as any,
    select: {
      id: true,
      subject: true,
      primaryCustomerEmail: true,
      primaryCustomerName: true,
      currentCategory: true,
      currentPriorityBand: true,
      sentiment: true,
      requiresHumanReview: true,
      automationTag: true,
      selectedPlaybook: { id: true },
      selectedPlaybookConfidence: true,
      playbookSelectionMetaJson: true,
      draftStatus: true,
      isVerifiedCustomer: true,
      customerConfidenceScore: true,
      shopifyCustomerId: true,
      shopifyOrderNumbers: true,
      shopifyOrderContext: true,
    },
    first: 1,
  });

  const conv = convRecords[0] as any;
  if (!conv) throw new Error(`Conversation ${conversationId} not found`);

  // Check if this is a verified Shopify customer
  const isVerified = conv.isVerifiedCustomer || false;
  const shopifyOrders = conv.shopifyOrderContext || [];
  const orderNumbers = conv.shopifyOrderNumbers || [];

  // Load recent messages
  const messages = await api.emailMessage.findMany({
    filter: { conversationId: { equals: conversationId } } as any,
    sort: { receivedDateTime: "Descending" },
    select: {
      id: true,
      subject: true,
      bodyPreview: true,
      fromAddress: true,
      fromName: true,
      receivedDateTime: true,
    },
    first: 5,
  });

  // Build context for Claude
  const customerName = conv.primaryCustomerName || "Customer";
  const category = conv.currentCategory || "general_enquiry";
  const sentiment = conv.sentiment || "neutral";
  const priority = conv.currentPriorityBand || "medium";
  const automationTag = conv.automationTag || "";
  const orderIdMatch = `${conv.subject || ""}\n${messages.map((m: any) => m?.bodyPreview || "").join("\n")}`.match(
    /\b(MRS|NRS)[-\s]?\d{5}\b/i
  );
  const extractedOrderId = orderIdMatch ? orderIdMatch[0].replace(/\s+/g, "-").toUpperCase() : null;

  // Build message history
  const messageHistory = messages
    .map((msg: any, idx: number) => {
      return `Message ${idx + 1}:
From: ${msg.fromName || msg.fromAddress}
Subject: ${msg.subject}
Content: ${msg.bodyPreview || "(No content)"}
Received: ${msg.receivedDateTime}
`;
    })
    .join("\n---\n");

  // Load and score active playbooks (template model repurposed as guidance playbooks)
  const playbooks = await api.template.findMany({
    first: 200,
    sort: { priority: "Ascending" } as any,
    filter: {
      OR: [{ isActive: { equals: true } }, { active: { equals: true } }],
    } as any,
    select: {
      id: true,
      name: true,
      scenarioKey: true,
      priority: true,
      whenToUse: true,
      signalsToCheckJson: true,
      questionsToAnswerJson: true,
      doNotSayJson: true,
      toneGuidelines: true,
      structureHintsJson: true,
      requiredDataJson: true,
      defaultCategory: true,
      defaultPriorityBand: true,
      isActive: true,
      active: true,
    } as any,
  });

  const searchableText = `${conv.subject || ""}\n${messages
    .map((m: any) => [m?.subject, m?.bodyPreview, m?.fromAddress].filter(Boolean).join(" "))
    .join("\n")}`.toLowerCase();

  const scoredPlaybooks = (playbooks as any[]).map((playbook) => {
    const scenarioKey = toScenarioKey(playbook);
    const signals = safeJsonParseArray<PlaybookSignal>(playbook.signalsToCheckJson);
    const questions = safeJsonParseArray<string>(playbook.questionsToAnswerJson);
    const structureHints = safeJsonParseArray<string>(playbook.structureHintsJson);
    const doNotSay = safeJsonParseArray<string>(playbook.doNotSayJson);
    const requiredData = safeJsonParseArray<string>(playbook.requiredDataJson);
    const signalResults: Record<string, boolean> = {};

    let matchedSignals = 0;
    for (const signal of signals) {
      const signalKey = signal.id || `${signal.type || "signal"}_${Object.keys(signalResults).length + 1}`;
      const matched = evaluateSignal(signal, { searchableText, orderId: extractedOrderId });
      signalResults[signalKey] = matched;
      if (matched) matchedSignals++;
    }

    const totalSignals = signals.length || 1;
    const confidence = Math.min(0.99, Math.max(0.05, matchedSignals / totalSignals));
    const sortPriority = typeof playbook.priority === "number" ? playbook.priority : 100;
    const matchReason =
      matchedSignals > 0
        ? `${matchedSignals}/${signals.length || 1} playbook signals matched`
        : "Selected by playbook priority fallback";

    return {
      id: playbook.id,
      scenarioKey,
      name: playbook.name,
      confidence,
      matchReason,
      signalResults,
      questions,
      structureHints,
      doNotSay,
      requiredData,
      whenToUse: playbook.whenToUse || "",
      toneGuidelines: playbook.toneGuidelines || "",
      defaultCategory: playbook.defaultCategory || null,
      defaultPriorityBand: playbook.defaultPriorityBand || null,
      sortPriority,
    };
  });

  scoredPlaybooks.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return a.scenarioKey.localeCompare(b.scenarioKey);
  });

  const selectedPlaybook = scoredPlaybooks[0] || null;
  const selectedPlaybooksMeta = scoredPlaybooks.slice(0, 3).map((pb) => ({
    scenarioKey: pb.scenarioKey,
    confidence: Number(pb.confidence.toFixed(2)),
    reason: pb.matchReason,
  }));

  // Build Shopify context
  let shopifyContext = "";
  if (isVerified && shopifyOrders.length > 0) {
    shopifyContext = `
✅ VERIFIED CUSTOMER - Registered in Shopify
Customer has ${shopifyOrders.length} order(s) on record:

${shopifyOrders
  .slice(0, 5)
  .map(
    (order: any, idx: number) => `
${idx + 1}. Order ${order.orderNumber}
   - Placed: ${new Date(order.createdAt).toLocaleDateString()}
   - Status: ${order.fulfillmentStatus || "Processing"}
   - Total: ${order.currency}${order.totalPrice}
   - Items: ${order.items?.map((item: any) => `${item.quantity}x ${item.title}`).join(", ") || "N/A"}
`
  )
  .join("\n")}

You may reference these orders naturally in your response.`;
  } else if (orderNumbers.length > 0) {
    shopifyContext = `
⚠️ UNVERIFIED - Customer not found in database, but order numbers mentioned: ${orderNumbers.join(", ")}
Proceed with caution. Do not share personal information.`;
  } else {
    shopifyContext = `
⚠️ UNVERIFIED - Customer not found in database and no order numbers detected.
Exercise extreme caution. Do not share any personal information.`;
  }

  // System prompt with company context
  const systemPrompt = `You are a professional customer service agent for Model Railway Scenes, an e-commerce company selling model railway products.

Your role is to draft professional, empathetic email responses to customer inquiries.

COMPANY CONTEXT:
- We sell model railway products (trains, scenery, accessories)
- We pride ourselves on excellent customer service
- Our order numbers are in format: MRS-##### or NRS-#####
- Standard delivery is 3-5 business days
- We offer full refunds within 30 days
- Customer service email: hello@modelrailwayscenes.com

CRITICAL SECURITY RULES:
${shopifyContext}

✅ SAFE TO INCLUDE (if verified customer):
- Order status and shipping status
- Item names and descriptions
- Estimated delivery dates
- General product information
- Tracking information (if available)

❌ NEVER INCLUDE (even for verified customers):
- Full shipping address
- Phone numbers
- Payment method details
- Email addresses
- Full names (unless customer mentioned it first)
- Specific personal details

⚠️ REQUIRE HUMAN REVIEW:
- ALL refund requests (any amount)
- Account access requests
- Address change requests
- Payment disputes
- Legal threats or mentions
- Requests for sensitive information

TONE GUIDELINES:
- Professional but friendly and warm
- Empathetic and understanding
- Clear and concise
- Solution-focused
- Never defensive or argumentative
${sentiment === "negative" ? "- EXTRA EMPATHETIC - Customer is frustrated/upset" : ""}

${(config as any)?.draftInstructions || ""}`;

  const playbookPromptBlock = selectedPlaybook
    ? `
SELECTED PLAYBOOK:
- Name: ${selectedPlaybook.name}
- Scenario key: ${selectedPlaybook.scenarioKey}
- Confidence: ${selectedPlaybook.confidence.toFixed(2)}
- Why selected: ${selectedPlaybook.matchReason}

WHEN TO USE:
${selectedPlaybook.whenToUse || "N/A"}

QUESTIONS TO ANSWER:
${selectedPlaybook.questions.length ? selectedPlaybook.questions.map((q: string) => `- ${q}`).join("\n") : "- Address the customer's explicit request clearly."}

STRUCTURE HINTS (guidance only, do not copy verbatim):
${selectedPlaybook.structureHints.length ? selectedPlaybook.structureHints.map((q: string) => `- ${q}`).join("\n") : "- Keep answer concise, empathetic, and actionable."}

DO NOT SAY:
${selectedPlaybook.doNotSay.length ? selectedPlaybook.doNotSay.map((q: string) => `- ${q}`).join("\n") : "- Avoid repetitive canned wording."}

TONE GUIDELINES:
${selectedPlaybook.toneGuidelines || "Natural, specific, and non-repetitive."}
`
    : "";

  // User prompt with conversation context
  const userPrompt = `Please draft a response email for this customer inquiry:

CUSTOMER: ${customerName}
EMAIL: ${conv.primaryCustomerEmail}
CATEGORY: ${category}
SENTIMENT: ${sentiment}
PRIORITY: ${priority}
${automationTag ? `SPECIAL FLAG: ${automationTag}` : ""}

CONVERSATION HISTORY:
${messageHistory}

---

INSTRUCTIONS:
1. Address the customer's main concern directly
2. Be empathetic to their situation
3. Provide clear next steps or solutions
4. Keep the tone ${sentiment === "negative" ? "especially empathetic and apologetic" : "friendly and professional"}
${priority === "urgent" || priority === "high" ? "5. Acknowledge the urgency and prioritize resolution" : ""}
${
  String(automationTag).includes("risk_keyword")
    ? "6. IMPORTANT: This customer used concerning language. Be extra careful, diplomatic, and consider escalating to a supervisor."
    : ""
}

${playbookPromptBlock}

Please write ONLY the email body. Do not include:
- Subject line
- Header line like "Dear ..."
- Signature/footer/sign-off lines
- Placeholder variables

Start directly with the email content.`;

  // Call Claude API
  let draftContent = "";
  let usedModel = "claude-sonnet-4-20250514";

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract text content
    const textContent = response.content.find((block: any) => block.type === "text");
    if (textContent && "text" in textContent) {
      draftContent = textContent.text.trim();
    } else {
      throw new Error("No text content in Claude response");
    }

    logger.info({ conversationId, length: draftContent.length }, "Draft generated successfully");
  } catch (err: any) {
    logger.error({ conversationId, error: err.message }, "Claude API call failed");

    // Best-effort audit trail
    try {
      await api.internal.aiComment.create({
        conversation: { _link: conversationId },
        kind: "error",
        source: auditSource,
        content: `Draft generation failed: ${err?.message || "Unknown error"}`,
        model: usedModel,
        user: actorUserId ? { _link: actorUserId } : undefined,
        metaJson: JSON.stringify({
          regenerate: Boolean(regenerate),
          category,
          priority,
          sentiment,
          isVerifiedCustomer: Boolean(isVerified),
          customerConfidenceScore: conv.customerConfidenceScore ?? null,
        }),
      });
    } catch (auditErr: any) {
      logger.warn({ conversationId, error: auditErr?.message }, "Failed to write aiComment audit record");
    }

    throw new Error(`Failed to generate draft: ${err.message}`);
  }

  const previousSelectionMeta = {
    selectedPlaybookId: (conv as any).selectedPlaybook?.id ?? null,
    selectedPlaybookConfidence: (conv as any).selectedPlaybookConfidence ?? null,
    currentCategory: conv.currentCategory ?? null,
    currentPriorityBand: conv.currentPriorityBand ?? null,
    draftStatus: (conv as any).draftStatus ?? null,
  };
  const nextCategory = selectedPlaybook?.defaultCategory || conv.currentCategory || null;
  const nextPriority = selectedPlaybook?.defaultPriorityBand || conv.currentPriorityBand || null;
  const nowIso = new Date().toISOString();
  const selectionAudit = {
    selectedPlaybooks: selectedPlaybooksMeta,
    signals: selectedPlaybook?.signalResults || {},
    evidence: [
      { type: "subject", text: conv.subject || "" },
      { type: "body", text: messages?.[0]?.bodyPreview || "" },
    ],
    variables: {
      orderId: extractedOrderId,
      customerName,
      customerEmail: conv.primaryCustomerEmail || null,
    },
    previous: previousSelectionMeta,
    next: {
      selectedPlaybookId: selectedPlaybook?.id || null,
      selectedPlaybookConfidence: selectedPlaybook ? Number(selectedPlaybook.confidence.toFixed(2)) : null,
      currentCategory: nextCategory,
      currentPriorityBand: nextPriority,
      draftStatus: "generated",
    },
    changed: {
      selectedPlaybook: previousSelectionMeta.selectedPlaybookId !== (selectedPlaybook?.id || null),
      category: previousSelectionMeta.currentCategory !== nextCategory,
      priorityBand: previousSelectionMeta.currentPriorityBand !== nextPriority,
      draftStatus: previousSelectionMeta.draftStatus !== "generated",
    },
    generatedAt: nowIso,
  };

  // Save draft to conversation
  await api.conversation.update(
    conversationId,
    {
      aiDraftContent: draftContent,
      aiDraftGeneratedAt: new Date(),
      aiDraftModel: usedModel,
      selectedPlaybook: selectedPlaybook?.id ? { _link: selectedPlaybook.id } : undefined,
      selectedPlaybookConfidence: selectedPlaybook ? Number(selectedPlaybook.confidence.toFixed(2)) : undefined,
      playbookSelectionMetaJson: JSON.stringify(selectionAudit),
      draftStatus: "generated",
      draftLastUpdatedAt: nowIso,
      ...(nextCategory ? { currentCategory: nextCategory } : {}),
      ...(nextPriority ? { currentPriorityBand: nextPriority } : {}),
    } as any
  );

  try {
    await api.internal.aiComment.create({
      conversation: { _link: conversationId },
      playbook: selectedPlaybook?.id ? { _link: selectedPlaybook.id } : undefined,
      kind: "playbook_selection",
      source: auditSource,
      content: selectedPlaybook
        ? `Selected playbook "${selectedPlaybook.name}" (${selectedPlaybook.confidence.toFixed(2)} confidence).`
        : "No playbook matched; used fallback guidance.",
      model: usedModel,
      user: actorUserId ? { _link: actorUserId } : undefined,
      metaJson: JSON.stringify(selectionAudit),
    } as any);
  } catch (err: any) {
    logger.warn({ conversationId, error: err?.message }, "Failed to write playbook selection audit record");
  }

  // Write aiComment audit trail (best-effort)
  try {
    await api.internal.aiComment.create({
      conversation: { _link: conversationId },
      playbook: selectedPlaybook?.id ? { _link: selectedPlaybook.id } : undefined,
      kind: "draft",
      source: auditSource,
      content: regenerate
        ? "AI draft regenerated using Claude with playbook guidance."
        : "AI draft generated using Claude with playbook guidance.",
      model: usedModel,
      user: actorUserId ? { _link: actorUserId } : undefined,
      metaJson: JSON.stringify({
        regenerate: Boolean(regenerate),
        category,
        priority,
        sentiment,
        automationTag,
        isVerifiedCustomer: Boolean(isVerified),
        customerConfidenceScore: conv.customerConfidenceScore ?? null,
        shopifyCustomerId: conv.shopifyCustomerId ?? null,
        shopifyOrderNumbers: Array.isArray(orderNumbers) ? orderNumbers : [],
        messageCountUsed: Array.isArray(messages) ? messages.length : 0,
        characterCount: draftContent.length,
        selectedPlaybook: selectedPlaybook
          ? {
              id: selectedPlaybook.id,
              scenarioKey: selectedPlaybook.scenarioKey,
              confidence: Number(selectedPlaybook.confidence.toFixed(2)),
            }
          : null,
        variables: {
          orderId: extractedOrderId,
          customerName,
        },
      }),
    } as any);
  } catch (err: any) {
    logger.warn({ conversationId, error: err?.message }, "Failed to write aiComment audit record");
  }

  return {
    success: true,
    conversationId,
    draftContent,
    model: usedModel,
    characterCount: draftContent.length,
  };
};

export const params = {
  conversationId: { type: "string" },
  regenerate: { type: "boolean" },
};

export const options: ActionOptions = {
  timeoutMS: 60000, // 60 seconds for API call
  triggers: { api: true },
};