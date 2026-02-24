import type { ActionOptions } from "gadget-server";

/**
 * undoNotCustomer
 *
 * Reverses a "Mark as Not a Customer" decision and returns the conversation to the queue.
 *
 * Params:
 *   conversationId: string (required)
 *   restoreMode: "return_to_queue" | "mark_as_customer" (for UI copy; both restore)
 */
export const params = {
  conversationId: { type: "string" },
  restoreMode: { type: "string" }, // "return_to_queue" | "mark_as_customer"
};

export const run: ActionRun = async ({ params: actionParams, api, logger, session }) => {
  const conversationId = actionParams.conversationId as string;

  if (!conversationId) throw new Error("conversationId is required");

  const conv = await api.conversation.findOne(conversationId, {
    select: {
      id: true,
      status: true,
      currentCategory: true,
      requiresHumanReview: true,
      isCustomer: true,
    },
  });

  if (!conv) throw new Error(`Conversation ${conversationId} not found`);

  const comments = await api.aiComment.findMany({
    filter: {
      conversation: { id: { equals: conversationId } },
      kind: { equals: "classification_override" },
    },
    sort: { createdAt: "Descending" },
    first: 50,
    select: { id: true, metaJson: true },
  });

  let prev: { status?: string; currentCategory?: string | null; requiresHumanReview?: boolean; isCustomer?: boolean } | null =
    null;

  for (const c of comments || []) {
    try {
      const meta = c.metaJson ? JSON.parse(c.metaJson) : {};
      if (meta.action === "mark_not_customer" && meta.prev) {
        prev = meta.prev;
        break;
      }
    } catch {
      continue;
    }
  }

  const restored = {
    status: prev?.status ?? "new",
    currentCategory: prev?.currentCategory ?? "unclassified",
    requiresHumanReview: prev?.requiresHumanReview ?? true,
    isCustomer: prev?.isCustomer ?? true,
  };

  const current = {
    status: (conv as any).status,
    currentCategory: (conv as any).currentCategory ?? null,
    requiresHumanReview: (conv as any).requiresHumanReview ?? false,
    isCustomer: (conv as any).isCustomer ?? false,
  };

  await api.conversation.update(conversationId, {
    isCustomer: true,
    nonCustomerReason: null,
    currentCategory: restored.currentCategory,
    requiresHumanReview: restored.requiresHumanReview,
    status: restored.status,
  } as any);

  const userRef = session?.get("user");
  const actorUserId =
    typeof userRef === "string" ? userRef : (userRef as any)?._link ?? (userRef as any)?.id ?? null;

  await api.internal.aiComment.create({
    conversation: { _link: conversationId },
    kind: "classification_override",
    source: "user",
    content: "Undo: Returned to queue",
    user: actorUserId ? { _link: actorUserId } : undefined,
    metaJson: JSON.stringify({
      action: "undo_not_customer",
      prev: current,
      next: restored,
    }),
  } as any);

  logger.info({ conversationId }, "Undo not customer - returned to queue");
  return { ok: true };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
