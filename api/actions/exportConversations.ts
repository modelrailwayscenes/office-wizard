import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api }) => {
  try {
    const conversations = await api.conversation.findMany({
      first: 250,
      select: {
        id: true,
        subject: true,
        status: true,
        primaryCustomerName: true,
        primaryCustomerEmail: true,
        currentPriorityBand: true,
        currentPriorityScore: true,
        currentCategory: true,
        automationTag: true,
        messageCount: true,
        unreadCount: true,
        firstMessageAt: true,
        latestMessageAt: true,
        resolved: true,
        resolvedAt: true,
        requiresHumanReview: true,
        internalNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return conversations;
  } catch (error) {
    logger.error({ error }, "Failed to fetch conversations");
    return [];
  }
};

export const options: ActionOptions = {
  returnType: true,
};
