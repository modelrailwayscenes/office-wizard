import type { ActionOptions } from "gadget-server";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// generateDraft
//
// Generates an AI-powered email response using Claude API.
// Takes conversation context and creates a professional, contextual reply.
// ---------------------------------------------------------------------------

export const run: ActionRun = async ({ logger, api, params, connections }) => {
  const { conversationId, regenerate } = params as any;
  if (!conversationId) throw new Error("conversationId is required");

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

  // Build Shopify context
  let shopifyContext = "";
  if (isVerified && shopifyOrders.length > 0) {
    shopifyContext = `
✅ VERIFIED CUSTOMER - Registered in Shopify
Customer has ${shopifyOrders.length} order(s) on record:

${shopifyOrders.slice(0, 5).map((order: any, idx: number) => `
${idx + 1}. Order ${order.orderNumber}
   - Placed: ${new Date(order.createdAt).toLocaleDateString()}
   - Status: ${order.fulfillmentStatus || 'Processing'}
   - Total: ${order.currency}${order.totalPrice}
   - Items: ${order.items?.map((item: any) => `${item.quantity}x ${item.title}`).join(', ') || 'N/A'}
`).join('\n')}

You may reference these orders naturally in your response.`;
  } else if (orderNumbers.length > 0) {
    shopifyContext = `
⚠️ UNVERIFIED - Customer not found in database, but order numbers mentioned: ${orderNumbers.join(', ')}
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
${automationTag.includes("risk_keyword") ? "6. IMPORTANT: This customer used concerning language. Be extra careful, diplomatic, and consider escalating to a supervisor." : ""}

Please write ONLY the email body. Do not include:
- Subject line (we'll use the existing thread)
- Greeting with customer name (we'll add this automatically)
- Signature (we'll add this automatically)

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
    throw new Error(`Failed to generate draft: ${err.message}`);
  }

  // Save draft to conversation
  await api.conversation.update(conversationId, {
    aiDraftContent: draftContent,
    aiDraftGeneratedAt: new Date(),
    aiDraftModel: usedModel,
  } as any);

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
