// api/actions/runTriage.ts

import type { ActionOptions } from "gadget-server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Category = "delivery_issue" | "damaged_item" | "refund_request" | "returns" | "general_enquiry";

type PriorityBand = "low" | "medium" | "high" | "urgent";
type Sentiment = "very_negative" | "negative" | "neutral" | "positive" | "very_positive";

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------
const ORDER_NUMBER_PATTERN = /\b(MRS|NRS)[-\s]?\d{5}\b/i;

const RISK_KEYWORDS = [
  "chargeback",
  "legal",
  "solicitor",
  "lawyer",
  "trading standards",
  "consumer rights",
  "court",
  "fraud",
  "scam",
  "threatening",
  "ombudsman",
  "watchdog",
];

const HIGH_PRIORITY_PHRASES = [
  "urgent",
  "asap",
  "immediately",
  "angry",
  "furious",
  "disgusted",
  "unacceptable",
  "never again",
  "appalling",
  "disgraceful",
];

// ALL REFUND REQUESTS require human review
const REFUND_KEYWORDS = [
  "refund",
  "money back",
  "chargeback",
  "reimbursement",
  "compensation",
  "want my money",
  "full refund",
  "partial refund",
];

const CATEGORY_SIGNALS: Record<Category, string[]> = {
  delivery_issue: [
    "where is my order",
    "not arrived",
    "hasn't arrived",
    "not delivered",
    "hasn't been delivered",
    "missing order",
    "lost parcel",
    "lost in post",
    "never arrived",
    "still waiting",
    "tracking",
    "delayed",
    "delay",
    "overdue",
    "where's my order",
    "haven't received",
    "not received",
  ],
  damaged_item: [
    "damaged",
    "broken",
    "cracked",
    "smashed",
    "faulty",
    "defective",
    "not working",
    "doesn't work",
    "stopped working",
    "arrived broken",
    "arrived damaged",
    "poor quality",
  ],
  refund_request: REFUND_KEYWORDS,
  returns: [
    "return",
    "send back",
    "returning",
    "exchange",
    "swap",
    "replacement",
    "wrong item",
    "wrong product",
    "incorrect item",
    "not what i ordered",
  ],
  general_enquiry: [
    "question",
    "query",
    "enquiry",
    "inquiry",
    "information",
    "details",
    "asking about",
    "can you tell me",
    "wondering",
    "interested in",
  ],
};

const NEGATIVE_WORDS = [
  "angry",
  "furious",
  "disgusted",
  "broken",
  "damaged",
  "unacceptable",
  "terrible",
  "awful",
  "horrible",
  "disappointed",
  "useless",
  "appalling",
  "disgraceful",
];

const POSITIVE_WORDS = [
  "thank",
  "great",
  "excellent",
  "happy",
  "pleased",
  "wonderful",
  "amazing",
  "love",
  "brilliant",
  "fantastic",
  "perfect",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scoreToBand(score: number): PriorityBand {
  if (score >= 76) return "urgent";
  if (score >= 51) return "high";
  if (score >= 21) return "medium";
  return "low";
}

function calculateSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const negCount = NEGATIVE_WORDS.filter((s) => lower.includes(s)).length;
  const posCount = POSITIVE_WORDS.filter((s) => lower.includes(s)).length;

  const score = posCount - negCount;

  if (score >= 3) return "very_positive";
  if (score >= 1) return "positive";
  if (score <= -3) return "very_negative";
  if (score <= -1) return "negative";
  return "neutral";
}

function ruleBasedScore(
  text: string,
  unread: number,
  msgCount: number,
  options?: { riskScoring?: boolean; timeSensitivity?: boolean; sentimentAnalysis?: boolean }
) {
  const lower = text.toLowerCase();
  let score = 0;
  let requiresHumanReview = false;
  let matchedRiskKeyword: string | null = null;
  const tags: string[] = [];
  const riskScoring = options?.riskScoring ?? true;
  const timeSensitivity = options?.timeSensitivity ?? true;
  const sentimentAnalysis = options?.sentimentAnalysis ?? true;

  // Order number found
  if (ORDER_NUMBER_PATTERN.test(text)) {
    score += 20;
    tags.push("has_order_number");
  }

  if (riskScoring) {
    // Risk keywords - CRITICAL
    for (const kw of RISK_KEYWORDS) {
      if (lower.includes(kw)) {
        score += 30;
        requiresHumanReview = true;
        matchedRiskKeyword = kw;
        tags.push(`risk_keyword:${kw}`);
        break;
      }
    }

    // CRITICAL: ALL REFUND REQUESTS require human review
    for (const kw of REFUND_KEYWORDS) {
      if (lower.includes(kw)) {
        requiresHumanReview = true;
        tags.push("refund_request");
        score += 20;
        break;
      }
    }
  }

  if (timeSensitivity) {
    // High priority phrases
    for (const phrase of HIGH_PRIORITY_PHRASES) {
      if (lower.includes(phrase)) {
        score += 10;
        tags.push("high_priority_phrase");
        break;
      }
    }
  }

  if (sentimentAnalysis) {
    // Negative sentiment words
    const negCount = NEGATIVE_WORDS.filter((s) => lower.includes(s)).length;
    if (negCount > 0) {
      score += Math.min(negCount * 5, 15);
      tags.push(`negative_words:${negCount}`);
    }
  }

  // Unread messages
  if (unread > 0) {
    score += 5;
    tags.push(`unread:${unread}`);
  }

  // Multiple messages
  if (msgCount > 1) {
    score += 5;
    tags.push(`multi_message:${msgCount}`);
  }

  // Category detection
  let bestCategory: Category = "general_enquiry";
  let maxMatches = 0;
  for (const [cat, signals] of Object.entries(CATEGORY_SIGNALS)) {
    const matches = signals.filter((s) => lower.includes(s)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = cat as Category;
    }
  }

  if (maxMatches > 0) {
    score += 15;
    tags.push(`category_boost:${bestCategory}`);
  }

  // Calculate sentiment (5 levels)
  const sentiment = sentimentAnalysis ? calculateSentiment(text) : "neutral";

  return {
    score: Math.min(score, 100),
    category: bestCategory,
    sentiment,
    requiresHumanReview,
    matchedRiskKeyword,
    tags,
  };
}

async function claudeClassify(
  subject: string,
  messagePreviews: string[],
  ruleScore: number,
  ruleCategory: Category,
  connections: any,
  logger: any
): Promise<{
  category: Category;
  priorityScore: number;
  sentiment: Sentiment;
  requiresHumanReview: boolean;
  confidence: number;
  model: string;
} | null> {
  const model = "claude-haiku-4-5-20251001";

  try {
    const prompt = `You are a customer service triage assistant for an e-commerce model railway business (Model Railway Scenes).

Classify this customer email thread. Respond with ONLY a valid JSON object — no explanation, no markdown.

Subject: "${subject}"
Messages:
${messagePreviews.map((p, i) => `[${i + 1}] ${p}`).join("\n")}

Rule-based pre-score: ${ruleScore}/100
Rule-based category: ${ruleCategory}

Respond with exactly:
{
  "category": "delivery_issue" | "damaged_item" | "refund_request" | "returns" | "general_enquiry",
  "priorityScore": 0-100,
  "sentiment": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
  "requiresHumanReview": true | false,
  "confidence": 0.0-1.0
}`;

    const response = await connections.anthropic.messages.create({
      model,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content?.[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return {
      category: (parsed.category || ruleCategory) as Category,
      priorityScore: Math.min(Math.max(Number(parsed.priorityScore) || ruleScore, 0), 100),
      sentiment: (parsed.sentiment || "neutral") as Sentiment,
      requiresHumanReview: Boolean(parsed.requiresHumanReview),
      confidence: Number(parsed.confidence) || 0.5,
      model,
    };
  } catch (err: any) {
    logger.warn({ err: err.message }, "Claude classification failed, using rule-based result");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main action
// ---------------------------------------------------------------------------
export const run: ActionRun = async ({ logger, api, params, connections, session }) => {
  const { conversationId } = params as any;
  if (!conversationId) throw new Error("conversationId is required");

  const userRef = session?.get("user");
  const actorUserId =
    typeof userRef === "string" ? userRef : userRef?._link || userRef?.id || null;
  const auditSource = session ? "admin_ui" : "system";

  logger.info({ conversationId }, "Starting triage with Shopify integration");

  const config = await api.appConfiguration.findFirst({
    select: {
      riskScoring: true,
      timeSensitivity: true,
      sentimentAnalysis: true,
      customerValueScoring: true,
      ageWeightPointsPerDay: true,
      manualReviewQueue: true,
      autoResolveSimple: true,
      autoSuggestResponses: true,
      notifyOnP0: true,
      notifyOnP1: true,
      notifyOnHighPriority: true,
    } as any,
  });
  const scoringConfig = {
    riskScoring: (config as any)?.riskScoring ?? true,
    timeSensitivity: (config as any)?.timeSensitivity ?? true,
    sentimentAnalysis: (config as any)?.sentimentAnalysis ?? true,
  };
  const customerValueScoring = (config as any)?.customerValueScoring ?? true;
  const ageWeightPointsPerDay = Number((config as any)?.ageWeightPointsPerDay ?? 0);
  const manualReviewQueue = (config as any)?.manualReviewQueue ?? true;
  const autoResolveSimple = (config as any)?.autoResolveSimple ?? false;
  const autoSuggestResponses = (config as any)?.autoSuggestResponses ?? true;
  const notifyOnP0 = (config as any)?.notifyOnP0 ?? false;
  const notifyOnP1 = (config as any)?.notifyOnP1 ?? false;
  const notifyOnHighPriority = (config as any)?.notifyOnHighPriority ?? false;

  // Load conversation
  const convRecords = await api.conversation.findMany({
    filter: { id: { equals: conversationId } } as any,
    select: {
      id: true,
      subject: true,
      primaryCustomerEmail: true,
      messageCount: true,
      unreadCount: true,
      status: true,
      firstMessageAt: true,
    },
    first: 1,
  });
  const conv = convRecords[0];
  if (!conv) throw new Error(`Conversation ${conversationId} not found`);

  const customerEmail = (conv as any).primaryCustomerEmail;

  // ==========================================================================
  // PHASE 0: SHOPIFY LOOKUP (HIGH CONFIDENCE VERIFICATION)
  // ==========================================================================
  let shopifyData: any = null;
  let isVerifiedCustomer = false;
  let shopifyOrderNumbers: string[] = [];
  let customerConfidenceScore = 50; // Default: medium confidence

  if (customerEmail && customerValueScoring) {
    try {
      logger.info({ email: customerEmail }, "Looking up customer in Shopify");
      shopifyData = await (api as any).shopifyLookupDirectAPI({ email: customerEmail });

      if (shopifyData.found && shopifyData.customer) {
        isVerifiedCustomer = true;
        customerConfidenceScore = 95; // HIGH CONFIDENCE - verified in Shopify
        shopifyOrderNumbers = shopifyData.orders?.map((o: any) => o.orderNumber) || [];

        logger.info(
          {
            email: customerEmail,
            customerId: shopifyData.customer.id,
            orderCount: shopifyOrderNumbers.length,
          },
          "✅ Customer VERIFIED in Shopify"
        );
      } else {
        customerConfidenceScore = 30; // LOW CONFIDENCE - not in database
        logger.info({ email: customerEmail }, "⚠️ Customer NOT FOUND in Shopify");
      }
    } catch (err: any) {
      logger.warn({ email: customerEmail, error: err.message }, "Shopify lookup failed");
    }
  }

  // Load last 5 messages
  const messages = await api.emailMessage.findMany({
    filter: { conversationId: { equals: conversationId } } as any,
    sort: { receivedDateTime: "Descending" },
    select: { id: true, subject: true, bodyPreview: true, fromAddress: true, receivedDateTime: true },
    first: 5,
  });

  const allText = [conv.subject || "", ...messages.map((m) => `${m.subject || ""} ${m.bodyPreview || ""}`)].join(" ");
  const messagePreviews = messages.map((m) => `From: ${m.fromAddress || "unknown"} — ${m.bodyPreview || "(no preview)"}`);

  // ==========================================================================
  // PHASE 1: RULE-BASED SCORING
  // ==========================================================================
  const ruleResult = ruleBasedScore(
    allText,
    (conv as any).unreadCount || 0,
    (conv as any).messageCount || 1,
    scoringConfig
  );
  logger.info({ conversationId, score: ruleResult.score, category: ruleResult.category }, "Rule-based scoring done");

  // Boost score if verified customer
  let finalScore = ruleResult.score;
  if (isVerifiedCustomer && customerValueScoring) {
    finalScore += 30; // Significant boost for verified customers
    ruleResult.tags.push("verified_customer");
    logger.info({ conversationId }, "Score boosted: verified Shopify customer");
  }

  if (ageWeightPointsPerDay > 0 && (conv as any).firstMessageAt) {
    const firstMessageAt = new Date((conv as any).firstMessageAt);
    const ageInDays = (Date.now() - firstMessageAt.getTime()) / (1000 * 60 * 60 * 24);
    const agePoints = Math.min(30, Math.floor(ageInDays * ageWeightPointsPerDay));
    if (agePoints > 0) {
      finalScore += agePoints;
      ruleResult.tags.push(`age_weight:${agePoints}`);
    }
  }

  // ==========================================================================
  // PHASE 2: CLAUDE AI (if ambiguous)
  // ==========================================================================
  let finalCategory = ruleResult.category;
  let finalSentiment = ruleResult.sentiment;
  let finalRequiresHumanReview = ruleResult.requiresHumanReview;
  let usedAI = false;
  let aiConfidence: number | null = null;
  let aiModelUsed: string | null = null;

  if (finalScore >= 50 && finalScore <= 75) {
    logger.info({ conversationId }, "Ambiguous score — calling Claude");
    const aiResult = await claudeClassify(conv.subject || "", messagePreviews, finalScore, ruleResult.category, connections, logger);
    if (aiResult) {
      finalCategory = aiResult.category;
      finalScore = aiResult.priorityScore;
      finalSentiment = aiResult.sentiment;
      finalRequiresHumanReview = aiResult.requiresHumanReview || ruleResult.requiresHumanReview;
      usedAI = true;
      aiConfidence = aiResult.confidence;
      aiModelUsed = aiResult.model;

      logger.info({ conversationId, aiScore: aiResult.priorityScore, confidence: aiResult.confidence }, "Claude classification done");
    }
  }

  // ==========================================================================
  // PHASE 3: QUARANTINE LOGIC
  // ==========================================================================
  let quarantinedForUnverified = false;

  // Quarantine if: not verified + no order number detected
  if (!isVerifiedCustomer && shopifyOrderNumbers.length === 0) {
    const hasOrderInText = ORDER_NUMBER_PATTERN.test(allText);
    if (!hasOrderInText && finalScore < 60) {
      finalRequiresHumanReview = true;
      quarantinedForUnverified = true;
      ruleResult.tags.push("uncertain:not_verified");
      logger.info({ conversationId }, "Flagged for quarantine: unverified customer, no order number");
    }
  }

  if (!scoringConfig.sentimentAnalysis) {
    finalSentiment = "neutral";
  }

  if (!manualReviewQueue) {
    finalRequiresHumanReview = false;
  }

  const finalBand = scoreToBand(Math.min(finalScore, 100));
  const automationTag = !autoSuggestResponses
    ? null
    : ruleResult.matchedRiskKeyword
      ? `risk_keyword:${ruleResult.matchedRiskKeyword}`
      : ruleResult.tags[0] || null;

  const shouldAlert =
    (finalBand === "urgent" && (notifyOnP0 || notifyOnHighPriority)) ||
    (finalBand === "high" && (notifyOnP1 || notifyOnHighPriority));

  if (shouldAlert) {
    await api.actionLog.create({
      action: "escalated",
      actionDescription: `Priority ${finalBand.toUpperCase()} conversation flagged`,
      performedAt: new Date(),
      performedBy: "system",
      performedVia: "auto_triage",
      conversation: { _link: conversationId },
      metadata: {
        priorityBand: finalBand,
        score: Math.min(finalScore, 100),
      },
    } as any);
  }

  // ==========================================================================
  // PHASE 4: WRITE RESULTS TO DATABASE
  // ==========================================================================
  const updateData: any = {
    currentCategory: finalCategory,
    currentPriorityScore: Math.min(finalScore, 100),
    currentPriorityBand: finalBand,
    sentiment: finalSentiment,
    requiresHumanReview: finalRequiresHumanReview,
    automationTag,
    lastTriagedAt: new Date(),
    status: (conv as any).status === "new" ? "in_progress" : (conv as any).status,

    // Shopify data
    isVerifiedCustomer,
    customerConfidenceScore,
  };

  if (autoResolveSimple && !finalRequiresHumanReview && finalScore <= 20) {
    updateData.status = "resolved";
    updateData.resolvedAt = new Date();
  }

  // Only add Shopify fields if they exist in schema
  if (shopifyData?.customer) {
    updateData.shopifyCustomerId = shopifyData.customer.id;
    updateData.shopifyOrderNumbers = shopifyOrderNumbers;
    updateData.shopifyOrderContext = shopifyData.orders?.slice(0, 5); // Store last 5 orders
  }

  await api.conversation.update(conversationId, updateData);

  // Write aiComment audit trail (best-effort)
  try {
    const keySignals: string[] = [];
    if (ruleResult.matchedRiskKeyword) keySignals.push(`risk_keyword:${ruleResult.matchedRiskKeyword}`);
    if (ruleResult.tags?.length) keySignals.push(...ruleResult.tags.slice(0, 8));

    const contentLines: string[] = [];
    contentLines.push(`Triage completed${usedAI ? " with AI assistance" : " via rules"}:`);
    contentLines.push(`- Category: ${finalCategory}`);
    contentLines.push(`- Priority: ${Math.min(finalScore, 100)} (${finalBand})`);
    contentLines.push(`- Sentiment: ${finalSentiment}`);
    contentLines.push(`- Requires human review: ${finalRequiresHumanReview ? "yes" : "no"}`);
    contentLines.push(`- Verified customer: ${isVerifiedCustomer ? "yes" : "no"} (confidence ${customerConfidenceScore})`);
    if (quarantinedForUnverified) contentLines.push(`- Quarantine flag: unverified + no order number`);
    if (keySignals.length) contentLines.push(`- Signals: ${keySignals.join(", ")}`);
    if (usedAI && aiConfidence != null) contentLines.push(`- AI confidence: ${aiConfidence}`);

    await api.internal.aiComment.create({
      conversation: { _link: conversationId },
      kind: "triage_run",
      source: auditSource,
      content: contentLines.join("\n"),
      model: usedAI ? aiModelUsed : null,
      user: actorUserId ? { _link: actorUserId } : undefined,
      metaJson: JSON.stringify({
        usedAI,
        triageEngine: usedAI ? "ai" : "rules",
        aiConfidence,
        aiModelUsed,
        ruleScore: ruleResult.score,
        finalScore: Math.min(finalScore, 100),
        categoryRule: ruleResult.category,
        categoryFinal: finalCategory,
        sentimentRule: ruleResult.sentiment,
        sentimentFinal: finalSentiment,
        requiresHumanReviewRule: ruleResult.requiresHumanReview,
        requiresHumanReviewFinal: finalRequiresHumanReview,
        priorityBandFinal: finalBand,
        automationTag,
        tags: ruleResult.tags || [],
        matchedRiskKeyword: ruleResult.matchedRiskKeyword,
        isVerifiedCustomer,
        customerConfidenceScore,
        shopifyOrderNumbers,
        quarantinedForUnverified,
        performedBy: actorUserId,
      }),
    });
  } catch (err: any) {
    logger.warn({ conversationId, error: err?.message }, "Failed to write aiComment audit record");
  }

  const result = {
    success: true,
    conversationId,
    category: finalCategory,
    priorityScore: Math.min(finalScore, 100),
    priorityBand: finalBand,
    sentiment: finalSentiment,
    requiresHumanReview: finalRequiresHumanReview,
    automationTag,
    usedAI,
    isVerifiedCustomer,
    customerConfidenceScore,
    shopifyOrderCount: shopifyOrderNumbers.length,
  };

  logger.info(result, "Triage complete");
  return result;
};

export const params = { conversationId: { type: "string" } };

export const options: ActionOptions = {
  timeoutMS: 60000,
  triggers: { api: true },
};