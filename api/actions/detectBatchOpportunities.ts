import { ActionOptions } from "gadget-server";

/**
 * detectBatchOpportunities
 * 
 * Scans untriaged/pending conversations and groups them by type
 * to create batch opportunities. Called automatically after AI triage
 * or manually from the dashboard.
 * 
 * Groups emails by:
 * 1. AI-classified request type (tracking, refund, product question, etc.)
 * 2. Minimum group size (default: 3)
 * 3. Only conversations with AI-generated responses ready
 * 
 * Deploy to: /api/actions/detectBatchOpportunities.ts
 * 
 * REQUIRED SCHEMA:
 * 
 * Model: batchOpportunity
 *   - opportunityId (String, required, unique)
 *   - type (String, required) — "tracking", "refund", "product_question", etc.
 *   - label (String, required) — "Tracking Requests"
 *   - status (String, default: "pending") — "pending", "actioned", "expired"
 *   - emailCount (Number, required)
 *   - estimatedTimeSaved (Number, required) — minutes
 *   - aiSuggestion (String, required) — "Send tracking template to all"
 *   - conversations (Has Many: Conversation via batchOpportunityId)
 *   - expiresAt (DateTime, optional) — auto-expire stale opportunities
 * 
 * Model: conversation (add field)
 *   - batchOpportunityId (Belongs To: batchOpportunity, optional)
 *   - aiClassification (String, optional) — "tracking", "refund", etc.
 *   - aiGeneratedResponse (Text, optional) — the AI draft response
 */

// ─── Config ──────────────────────────────────────────────────────────
const BATCH_CONFIG: Record<string, {
  label: string;
  aiSuggestion: string;
  minutesPerEmail: number;
  minGroupSize: number;
}> = {
  tracking: {
    label: "Tracking Requests",
    aiSuggestion: "Send tracking template to all",
    minutesPerEmail: 2,
    minGroupSize: 2,
  },
  refund: {
    label: "Refund Requests",
    aiSuggestion: "Process refunds and send confirmation",
    minutesPerEmail: 3,
    minGroupSize: 2,
  },
  product_question: {
    label: "Product Availability",
    aiSuggestion: "Send stock update template",
    minutesPerEmail: 2,
    minGroupSize: 2,
  },
  order_issue: {
    label: "Order Issues",
    aiSuggestion: "Review and respond to order problems",
    minutesPerEmail: 3,
    minGroupSize: 2,
  },
  general: {
    label: "General Enquiries",
    aiSuggestion: "Review and send individual responses",
    minutesPerEmail: 2,
    minGroupSize: 3,
  },
};

// ─── Params ──────────────────────────────────────────────────────────
export const params = {
  forceRefresh: { type: "boolean" }, // Clear existing opportunities and re-scan
};

// ─── Action ──────────────────────────────────────────────────────────
export const run: ActionRun = async ({ params, api, logger }) => {
  const { forceRefresh = false } = params;

  logger.info({ forceRefresh }, "Detecting batch opportunities");

  // ── Optionally clear existing pending opportunities ────────────────
  if (forceRefresh) {
    const existing = await api.batchOpportunity.findMany({
      filter: { status: { equals: "pending" } },
    });
    for (const opp of existing) {
      await api.batchOpportunity.update(opp.id, { status: "expired" });
    }
    logger.info({ cleared: existing.length }, "Cleared existing pending opportunities");
  }

  // ── Find all pending conversations with AI classifications ─────────
  const conversations = await api.conversation.findMany({
    filter: {
      AND: [
        { status: { in: ["new", "pending", "ai_triaged"] } },
        { aiClassification: { isSet: true } },
        { aiGeneratedResponse: { isSet: true } },
        // Don't include conversations already in an active batch
        { batchOpportunityId: { isSet: false } },
      ],
    },
    select: {
      id: true,
      conversationId: true,
      subject: true,
      primaryCustomerEmail: true,
      primaryCustomerName: true,
      aiClassification: true,
      aiGeneratedResponse: true,
      priority: true,
      sentiment: true,
      createdAt: true,
      latestMessageAt: true,
      messages: {
        edges: {
          node: {
            id: true,
            fromEmail: true,
            fromName: true,
            bodyPreview: true,
            bodyText: true,
            receivedAt: true,
          },
        },
      },
    },
    sort: { latestMessageAt: "Descending" },
    first: 200, // Cap at 200 for performance
  });

  logger.info({ conversationCount: conversations.length }, "Found conversations to group");

  // ── Group by classification ────────────────────────────────────────
  const groups: Record<string, Array<(typeof conversations)[number]>> = {};

  for (const conv of conversations) {
    const classification = (conv.aiClassification || "general").toLowerCase();
    if (!groups[classification]) {
      groups[classification] = [];
    }
    groups[classification].push(conv);
  }

  // ── Create batch opportunities for qualifying groups ───────────────
  const opportunities: Array<{
    id: string;
    type: string;
    label: string;
    emailCount: number;
    estimatedTimeSaved: number;
  }> = [];

  for (const [type, convs] of Object.entries(groups)) {
    const config = BATCH_CONFIG[type] || BATCH_CONFIG.general;
    
    if (convs.length < config.minGroupSize) {
      logger.info({ type, count: convs.length, min: config.minGroupSize }, "Group too small, skipping");
      continue;
    }

    const estimatedTimeSaved = convs.length * config.minutesPerEmail;
    const oppId = `opp-${type}-${Date.now()}`;

    // Create the opportunity record
    const opportunity = await api.batchOpportunity.create({
      opportunityId: oppId,
      type,
      label: config.label,
      status: "pending",
      emailCount: convs.length,
      estimatedTimeSaved,
      aiSuggestion: config.aiSuggestion,
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(), // 24h expiry
    });

    // Link conversations to this opportunity
    for (const conv of convs) {
      await api.conversation.update(conv.id, {
        batchOpportunity: { _link: opportunity.id },
      });
    }

    opportunities.push({
      id: opportunity.id,
      type,
      label: config.label,
      emailCount: convs.length,
      estimatedTimeSaved,
    });

    logger.info(
      { type, label: config.label, count: convs.length, timeSaved: estimatedTimeSaved },
      "Created batch opportunity"
    );
  }

  return {
    opportunitiesCreated: opportunities.length,
    totalEmailsGrouped: opportunities.reduce((s, o) => s + o.emailCount, 0),
    totalEstimatedTimeSaved: opportunities.reduce((s, o) => s + o.estimatedTimeSaved, 0),
    opportunities,
  };
};

export const options: ActionOptions = {
  // Can be triggered after AI triage completes, or manually
};