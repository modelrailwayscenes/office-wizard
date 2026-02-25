import type { ActionOptions } from "gadget-server";

/**
 * markNotCustomer
 *
 * Marks a conversation as "Not a Customer" so it drops out of Triage.
 * Reversible via undoNotCustomer.
 *
 * Params:
 *   conversationId: string (required)
 *   reason?: string (optional)
 */
export const params = {
  conversationId: { type: "string" },
  reason: { type: "string" },
  reasonType: { type: "string" },
  reasonScope: { type: "string" },
  patternValue: { type: "string" },
  reasonDetails: { type: "string" },
};

export const run: ActionRun = async ({ params: actionParams, api, logger, session }) => {
  const conversationId = actionParams.conversationId as string;
  const reason = (actionParams.reason as string) || "";
  const reasonType = (actionParams.reasonType as string) || "other";
  const reasonScope = (actionParams.reasonScope as string) || "conversation";
  const patternValue = (actionParams.patternValue as string) || "";
  const reasonDetails = (actionParams.reasonDetails as string) || "";

  if (!conversationId) throw new Error("conversationId is required");

  const conv = await api.conversation.findOne(conversationId, {
    select: {
      id: true,
      status: true,
      currentCategory: true,
      requiresHumanReview: true,
      isCustomer: true,
      primaryCustomerEmail: true,
    },
  });

  if (!conv) throw new Error(`Conversation ${conversationId} not found`);

  const prev = {
    status: (conv as any).status,
    currentCategory: (conv as any).currentCategory ?? null,
    requiresHumanReview: (conv as any).requiresHumanReview ?? false,
    isCustomer: (conv as any).isCustomer ?? true,
  };

  const next = {
    status: "ignored",
    currentCategory: "not_customer",
    requiresHumanReview: false,
    isCustomer: false,
  };

  const userRef = session?.get("user");
  const actorUserId =
    typeof userRef === "string" ? userRef : (userRef as any)?._link ?? (userRef as any)?.id ?? null;

  await api.conversation.update(conversationId, {
    isCustomer: false,
    nonCustomerReason: reason || null,
    currentCategory: "not_customer",
    requiresHumanReview: false,
    status: "ignored",
  } as any);

  await api.internal.aiComment.create({
    conversation: { _link: conversationId },
    kind: "classification_override",
    source: "user",
    content: "Marked as Not a Customer",
    user: actorUserId ? { _link: actorUserId } : undefined,
    metaJson: JSON.stringify({
      action: "mark_not_customer",
      prev,
      next,
      reason: reason || null,
      reasonType,
      reasonScope,
      patternValue: patternValue || null,
      reasonDetails: reasonDetails || null,
      learningSignal: {
        source: "operator_feedback",
        sender: (conv as any).primaryCustomerEmail ?? null,
        reasonType,
        reasonScope,
        ruleCandidate:
          reasonScope !== "conversation"
            ? {
                scope: reasonScope,
                value: patternValue || (conv as any).primaryCustomerEmail || null,
                note: reasonDetails || null,
              }
            : null,
        patternValue: patternValue || null,
      },
    }),
  } as any);

  logger.info({ conversationId, reason, reasonType, patternValue }, "Marked as not a customer");
  return { ok: true };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
