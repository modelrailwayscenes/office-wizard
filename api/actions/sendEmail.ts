import { ActionOptions } from "gadget-server";
import { getMicrosoftGraphClient } from "../lib/microsoftGraph";

/**
 * Send email replies via Outlook with template rendering and approval workflow
 * 
 * @param params.accessToken - Microsoft Graph access token (required)
 * @param params.conversationId - ID of the conversation to reply to (required)
 * @param params.templateId - Template ID to use for the reply body (optional)
 * @param params.customBody - Custom body text if template not provided (optional)
 * @param params.variables - Variables for template rendering (optional)
 * @param params.requiresApproval - Whether email requires approval (default: true for urgent/high priority)
 * @param params.approvedBy - Email of approver if required (optional)
 * @param params.saveAsDraft - Save as draft instead of sending (default: false)
 * @returns Object with success status, messageId, isDraft flag, and sentAt timestamp
 */
export const run: ActionRun = async ({ params, logger, api }) => {
  const {
    accessToken,
    conversationId,
    templateId,
    customBody,
    variables,
    requiresApproval,
    approvedBy,
    saveAsDraft,
  } = params;

  // Validate required parameters
  if (!accessToken) {
    throw new Error("accessToken is required");
  }
  if (!conversationId) {
    throw new Error("conversationId is required");
  }

  logger.info({ conversationId, templateId, saveAsDraft }, "Starting sendEmail action");

  try {
    // Fetch the conversation with latest message
    const conversation = await api.conversation.findOne(conversationId, {
      select: {
        id: true,
        conversationId: true,
        subject: true,
        participants: true,
        primaryCustomerEmail: true,
        currentPriorityBand: true,
        messages: {
          edges: {
            node: {
              id: true,
              messageId: true,
              fromAddress: true,
              toAddresses: true,
              subject: true,
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Determine reply recipients from participants
    const participants = conversation.participants as any;
    const replyTo = conversation.primaryCustomerEmail || participants?.from || participants?.[0];
    
    if (!replyTo) {
      throw new Error("No reply recipient found in conversation");
    }

    // Get latest message for reply threading
    const latestMessage = conversation.messages.edges[0]?.node;
    if (!latestMessage) {
      throw new Error("No messages found in conversation");
    }

    let emailBody = customBody;
    let templateUsed: string | null = null;

    // Render template if templateId provided
    if (templateId) {
      const template = await api.template.findOne(templateId, {
        select: {
          id: true,
          name: true,
          bodyText: true,
          subject: true,
          signature: {
            id: true,
            body: true,
            signOff: true,
          },
          availableVariables: true,
        },
      });

      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      templateUsed = template.name;

      // Simple template variable replacement
      emailBody = template.bodyText;
      if (variables && typeof variables === "object") {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
          emailBody = emailBody.replace(regex, String(value));
        }
      }

      // Add signature if present
      if (template.signature) {
        const signatureText = `${template.signature.signOff}\n${template.signature.body}`;
        emailBody = `${emailBody}\n\n${signatureText}`;
      }
    }

    if (!emailBody) {
      throw new Error("Either templateId or customBody must be provided");
    }

    // Check approval requirements
    const shouldRequireApproval = requiresApproval !== undefined 
      ? requiresApproval 
      : (conversation.currentPriorityBand === "urgent" || conversation.currentPriorityBand === "high");

    if (shouldRequireApproval && !approvedBy) {
      throw new Error("approvedBy is required when requiresApproval is true or for urgent/high priority conversations");
    }

    // Initialize Graph client
    const graphClient = getMicrosoftGraphClient(accessToken);

    // Prepare email message
    const message = {
      subject: `Re: ${conversation.subject}`,
      body: {
        contentType: "Text",
        content: emailBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: replyTo,
          },
        },
      ],
    };

    let messageId: string;
    const isDraft = saveAsDraft === true;
    const sentAt = new Date();

    // Send email or save as draft
    if (isDraft) {
      const draftResponse = await graphClient.api('/me/messages').post(message);
      messageId = draftResponse.id;
      logger.info({ messageId, conversationId }, "Email saved as draft");
    } else {
      await graphClient.api('/me/sendMail').post({ message });
      messageId = latestMessage.messageId; // Use original message ID as reference since sendMail returns 202 with no body
      logger.info({ messageId, conversationId }, "Email sent successfully");
    }

    // Create action log
    const actionLogData: any = {
      action: "email_sent",
      actionDescription: isDraft 
        ? `Draft created for conversation ${conversation.conversationId}`
        : `Email sent to ${replyTo}`,
      performedAt: sentAt,
      performedBy: approvedBy || "system",
      performedVia: "api",
      conversation: { _link: conversation.id },
      templateUsed,
      autoSent: false,
      sentTo: [replyTo],
      metadata: {
        messageId,
        isDraft,
        requiresApproval: shouldRequireApproval,
        approvedBy,
      },
    };

    if (templateId) {
      actionLogData.template = { _link: templateId };
    }

    await api.actionLog.create(actionLogData);

    // Update conversation status if email was sent (not draft)
    if (!isDraft) {
      await api.conversation.update(conversation.id, {
        status: "waiting_customer",
      });
      logger.info({ conversationId }, "Conversation status updated to waiting_customer");
    }

    return {
      success: true,
      messageId,
      isDraft,
      sentAt: sentAt.toISOString(),
    };
  } catch (error) {
    logger.error({ error, conversationId }, "Error sending email");
    try {
      const config = await api.appConfiguration.findFirst({
        select: { notifyOnAutoSendFailure: true } as any,
      });
      if ((config as any)?.notifyOnAutoSendFailure) {
        await api.actionLog.create({
          action: "email_sent",
          actionDescription: `Email send failed for conversation ${conversationId}`,
          performedAt: new Date(),
          performedBy: approvedBy || "system",
          performedVia: "api",
          conversation: conversationId ? { _link: conversationId } : undefined,
          success: false,
          errorMessage: (error as any)?.message || String(error),
        } as any);
      }
    } catch (logError) {
      logger.warn({ logError }, "Failed to record email failure action log");
    }
    throw error;
  }
};

export const params = {
  accessToken: {
    type: "string",
  },
  conversationId: {
    type: "string",
  },
  templateId: {
    type: "string",
  },
  customBody: {
    type: "string",
  },
  variables: {
    type: "object",
    additionalProperties: true,
  },
  requiresApproval: {
    type: "boolean",
  },
  approvedBy: {
    type: "string",
  },
  saveAsDraft: {
    type: "boolean",
  },
};

export const options: ActionOptions = {
  triggers: {
    api: true,
  },
};
