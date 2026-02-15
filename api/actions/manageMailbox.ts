import { getMicrosoftGraphClient } from "../lib/microsoftGraph";
import type { ActionOptions } from "gadget-server";

/**
 * Global action for performing mailbox management operations.
 * Supports moving, flagging, categorizing, and marking emails as read/unread.
 */
export const run: ActionRun = async ({ params, logger, api }) => {
  // Let Gadget handle the typing through the exported params object
  const { accessToken, operation, messageIds, targetFolder, category, flagStatus } = params;

  // Validate required parameters
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("accessToken is required and must be a string");
  }

  if (!operation || typeof operation !== "string") {
    throw new Error("operation is required and must be a string");
  }

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    throw new Error("messageIds is required and must be a non-empty array");
  }

  // Validate operation-specific parameters
  if (operation === "move" && (!targetFolder || typeof targetFolder !== "string")) {
    throw new Error("targetFolder is required for move operation");
  }

  if (operation === "categorize" && (!category || typeof category !== "string")) {
    throw new Error("category is required for categorize operation");
  }

  if (operation === "flag" && (!flagStatus || typeof flagStatus !== "string")) {
    throw new Error("flagStatus is required for flag operation and must be 'flagged' or 'complete'");
  }

  // Initialize GraphClient
  const graphClient = getMicrosoftGraphClient(accessToken);

  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ messageId: string; error: string }> = [];

  // Process each message
  for (const messageId of messageIds) {
    try {
      // Perform the operation based on type
      switch (operation) {
        case "move":
          await graphClient.api(`/me/messages/${messageId}/move`).post({
            destinationId: targetFolder!
          });
          logger.info({ messageId, targetFolder }, "Message moved successfully");
          break;

        case "flag":
          await graphClient.api(`/me/messages/${messageId}`).patch({
            flag: {
              flagStatus: flagStatus!
            }
          });
          logger.info({ messageId, flagStatus }, "Message flagged successfully");
          break;

        case "categorize":
          // Get current categories first to append the new one
          const currentMessage = await graphClient.api(`/me/messages/${messageId}?$select=categories`).get();
          const existingCategories = currentMessage.categories || [];
          await graphClient.api(`/me/messages/${messageId}`).patch({
            categories: [...existingCategories, category!]
          });
          logger.info({ messageId, category }, "Message categorized successfully");
          break;

        case "mark_read":
          await graphClient.api(`/me/messages/${messageId}`).patch({
            isRead: true
          });
          logger.info({ messageId }, "Message marked as read");
          break;

        case "mark_unread":
          await graphClient.api(`/me/messages/${messageId}`).patch({
            isRead: false
          });
          logger.info({ messageId }, "Message marked as unread");
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Update emailMessage record in database
      const emailMessage = await api.emailMessage.findFirst({
        filter: { messageId: { equals: messageId } },
      });

      if (emailMessage) {
        const updateData: Record<string, any> = {};

        if (operation === "move") {
          updateData.folderPath = targetFolder;
        } else if (operation === "flag") {
          updateData.isFlagged = flagStatus === "flagged";
        } else if (operation === "categorize") {
          // Add category to existing categories
          const currentCategories = emailMessage.categories || [];
          updateData.categories = Array.isArray(currentCategories)
            ? [...currentCategories, category]
            : [category];
        } else if (operation === "mark_read") {
          updateData.isRead = true;
        } else if (operation === "mark_unread") {
          updateData.isRead = false;
        }

        await api.emailMessage.update(emailMessage.id, updateData);

        // Update conversation if needed
        if (emailMessage.conversationId) {
          const conversation = await api.conversation.findOne(emailMessage.conversationId);
          if (conversation) {
            const conversationUpdateData: Record<string, any> = {};

            if (operation === "move") {
              conversationUpdateData.folderPath = targetFolder;
            } else if (operation === "categorize") {
              const currentCategories = conversation.outlookCategories || [];
              conversationUpdateData.outlookCategories = Array.isArray(currentCategories)
                ? [...currentCategories, category]
                : [category];
            }

            if (Object.keys(conversationUpdateData).length > 0) {
              await api.conversation.update(emailMessage.conversationId, conversationUpdateData);
            }
          }
        }

        // Create action log
        await api.actionLog.create({
          action: operation === "move" ? "moved_folder" : operation === "flag" ? "flagged" : operation === "categorize" ? "category_applied" : operation === "mark_read" ? "marked_read" : "marked_unread",
          actionDescription: `${operation} operation performed on message ${messageId}`,
          performedAt: new Date(),
          performedBy: "system",
          performedVia: "api",
          emailMessage: { _link: emailMessage.id },
          conversation: emailMessage.conversationId ? { _link: emailMessage.conversationId } : undefined,
          folderMovedTo: operation === "move" ? targetFolder : undefined,
          categoryApplied: operation === "categorize" ? category : undefined,
          success: true,
          metadata: { operation, messageId },
        });
      }

      successCount++;
    } catch (error) {
      failureCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ messageId, error: errorMessage });
      logger.error({ messageId, error: errorMessage }, "Failed to process message");
    }
  }

  logger.info({ successCount, failureCount, operation }, "Mailbox management operation completed");

  return {
    successCount,
    failureCount,
    errors,
  };
};

export const options: ActionOptions = {
  returnType: true,
};

// Export params for Gadget's type generation
export const params = {
  accessToken: { type: "string" },
  operation: { type: "string" },
  messageIds: { type: "array", items: { type: "string" } },
  targetFolder: { type: "string" },
  category: { type: "string" },
  flagStatus: { type: "string" },
};
