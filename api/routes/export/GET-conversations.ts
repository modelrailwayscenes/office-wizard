import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ request, reply, api, logger }) => {
  try {
    // Fetch all conversation records with the specified fields
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

    // Set headers for file download
    reply.header("Content-Type", "application/json");
    reply.header("Content-Disposition", 'attachment; filename="conversations-export.json"');

    // Send the data as JSON
    await reply.send(conversations);
  } catch (error) {
    logger.error({ error }, "Failed to export conversations");
    
    await reply.code(500).send({
      error: "Failed to export conversations",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};

export default route;