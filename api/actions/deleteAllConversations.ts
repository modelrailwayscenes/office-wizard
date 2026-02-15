import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api }) => {
  let totalDeleted = 0;
  let hasMore = true;

  logger.info("Starting to delete all conversations");

  try {
    while (hasMore) {
      // Fetch up to 250 conversation IDs at a time
      const conversations = await api.conversation.findMany({
        first: 250,
        select: { id: true }
      });

      if (conversations.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(`Found ${conversations.length} conversations to delete`);

      // Delete each conversation
      for (const conversation of conversations) {
        try {
          await api.conversation.delete(conversation.id);
          totalDeleted++;
        } catch (error) {
          logger.error({ error, conversationId: conversation.id }, "Failed to delete conversation");
        }
      }

      logger.info(`Deleted ${conversations.length} conversations, total so far: ${totalDeleted}`);

      // If we got fewer than 250, we're done
      if (conversations.length < 250) {
        hasMore = false;
      }
    }

    logger.info(`Successfully deleted ${totalDeleted} conversations`);

    return {
      deleted: totalDeleted,
      message: `Successfully deleted ${totalDeleted} conversation${totalDeleted !== 1 ? 's' : ''}`
    };
  } catch (error) {
    logger.error({ error }, "Error during conversation deletion");
    throw error;
  }
};

export const options: ActionOptions = {
  returnType: true
};
