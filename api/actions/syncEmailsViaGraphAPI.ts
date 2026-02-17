import type { ActionOptions } from "gadget-server";
import { Client } from "@microsoft/microsoft-graph-client";
import type { Message } from "@microsoft/microsoft-graph-types";

// Helper functions for extracting data from Graph API objects
const asEmail = (addr: any): string | null => {
  return addr?.emailAddress?.address || null;
};

const asName = (addr: any): string | null => {
  return addr?.emailAddress?.name || null;
};

const toEmailList = (recipients: any[]): string[] => {
  if (!Array.isArray(recipients)) return [];
  return recipients
    .map(r => asEmail(r))
    .filter((email): email is string => email !== null);
};

const getConversationKeyFromGraphMessage = (msg: Message): string | null => {
  return msg.conversationId || null;
};

// AccessTokenAuthProvider for Microsoft Graph Client
class AccessTokenAuthProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export const run: ActionRun = async ({ logger, api, params }) => {
  // Load app configuration with Microsoft token
  let config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiresAt: true,
      lastSyncAt: true,
    },
  });

  if (!config) {
    throw new Error("App configuration not found");
  }

  // Refresh token if expiring within 5 minutes
  const now = new Date();
  const expiresAt = config.microsoftTokenExpiresAt ? new Date(config.microsoftTokenExpiresAt) : null;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt <= fiveMinutesFromNow) {
    logger.info("Token expiring soon, refreshing");
    await api.refreshAccessToken();
    
    // Reload config after refresh
    config = await api.appConfiguration.findFirst({
      select: {
        id: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
        lastSyncAt: true,
      },
    });
  }

  if (!config?.microsoftAccessToken) {
    throw new Error("No access token available");
  }

  // Create Microsoft Graph Client with auth provider
  const authProvider = new AccessTokenAuthProvider(config.microsoftAccessToken);
  const client = Client.init({
    authProvider: (done) => {
      authProvider.getAccessToken().then(token => {
        done(null, token);
      }).catch(err => {
        done(err, null);
      });
    },
  });

  // Parse parameters
  const top = Math.min(Math.max(Number(params.top ?? 100), 1), 100);
  const unreadOnly = Boolean(params.unreadOnly ?? false);
  const lastSyncAt = config.lastSyncAt;

  // Build query
  let query = client
    .api("/me/mailFolders/Inbox/messages")
    .top(top)
    .select([
      "id",
      "subject",
      "receivedDateTime",
      "sentDateTime",
      "from",
      "toRecipients",
      "ccRecipients",
      "isRead",
      "bodyPreview",
      "body",
      "conversationId",
      "internetMessageId",
      "hasAttachments",
    ])
    .orderby("receivedDateTime desc");

  // Build filter conditions
  const filterConditions: string[] = [];
  
  if (unreadOnly) {
    filterConditions.push("isRead eq false");
  }
  
  if (lastSyncAt) {
    const lastSyncDate = new Date(lastSyncAt).toISOString();
    filterConditions.push(`receivedDateTime gt ${lastSyncDate}`);
  }

  if (filterConditions.length > 0) {
    query = query.filter(filterConditions.join(" and "));
  }

  logger.info({ top, unreadOnly, lastSyncAt, filterConditions }, "Fetching messages from Graph API");

  // Execute query
  const response = await query.get();
  const messages: Message[] = response.value || [];

  logger.info({ count: messages.length }, "Fetched messages from Graph API");

  // Counters
  let messagesCreated = 0;
  let messagesDuplicate = 0;
  let conversationsCreated = 0;
  let conversationsUpdated = 0;
  let errors = 0;

  // Process each message
  for (const msg of messages) {
    try {
      // Check for duplicate by externalMessageId
      if (msg.id) {
        const existing = await api.emailMessage.findMany({
          filter: { externalMessageId: { equals: msg.id } },
          first: 1,
        });
        
        if (existing && existing.length > 0) {
          messagesDuplicate++;
          continue;
        }
      }

      // Extract conversation key
      const graphConversationId = getConversationKeyFromGraphMessage(msg);
      if (!graphConversationId) {
        logger.warn({ messageId: msg.id }, "Message missing conversationId, skipping");
        errors++;
        continue;
      }

      // Find or create conversation
      let conversation = null;
      const existingConversations = await api.conversation.findMany({
        filter: { graphConversationId: { equals: graphConversationId } },
        first: 1,
      });

      if (existingConversations && existingConversations.length > 0) {
        conversation = existingConversations[0];
      }

      const normalizedSubject = (msg.subject || "(No subject)").replace(/^(Re:|Fwd?:)\s*/gi, '').trim();
      const fromAddress = asEmail(msg.from);
      const fromName = asName(msg.from);
      const receivedDateTime = msg.receivedDateTime || msg.sentDateTime;

      if (!conversation) {
        // Create new conversation
        conversation = await api.conversation.create({
          conversationId: graphConversationId,
          graphConversationId: graphConversationId,
          subject: normalizedSubject,
          primaryCustomerEmail: fromAddress,
          primaryCustomerName: fromName,
          firstMessageAt: receivedDateTime,
          latestMessageAt: receivedDateTime,
          messageCount: 1,
          unreadCount: msg.isRead ? 0 : 1,
          status: "new",
        });
        conversationsCreated++;
      } else {
        // Update existing conversation
        const newMessageCount = (conversation.messageCount || 0) + 1;
        const newUnreadCount = msg.isRead ? conversation.unreadCount : (conversation.unreadCount || 0) + 1;
        const newLatestMessageAt = receivedDateTime;
        const newFirstMessageAt = conversation.firstMessageAt && new Date(conversation.firstMessageAt) < new Date(receivedDateTime)
          ? conversation.firstMessageAt
          : receivedDateTime;

        await api.conversation.update(conversation.id, {
          messageCount: newMessageCount,
          unreadCount: newUnreadCount,
          latestMessageAt: newLatestMessageAt,
          firstMessageAt: newFirstMessageAt,
        });
        conversationsUpdated++;
      }

      // Validate required fields for emailMessage
      if (!fromAddress || !receivedDateTime || !msg.id || !graphConversationId) {
        logger.warn({
          messageId: msg.id,
          subject: msg.subject,
          missing: {
            fromAddress: !fromAddress,
            receivedDateTime: !receivedDateTime,
            id: !msg.id,
            graphConversationId: !graphConversationId,
          },
        }, "Skipping message - missing required fields");
        errors++;
        continue;
      }

      // Create email message
      await api.emailMessage.create({
        conversation: { _link: conversation.id },
        messageId: msg.id,
        externalMessageId: msg.id,
        graphConversationId: graphConversationId,
        internetMessageId: msg.internetMessageId || null,
        fromAddress: fromAddress,
        fromEmail: fromAddress,
        fromName: fromName,
        subject: msg.subject || "(No subject)",
        bodyPreview: msg.bodyPreview || null,
        bodyHtml: msg.body?.contentType === "html" ? msg.body.content : null,
        bodyText: msg.body?.contentType === "text" ? msg.body.content : msg.bodyPreview || null,
        receivedDateTime: receivedDateTime,
        sentDateTime: msg.sentDateTime || null,
        isRead: msg.isRead || false,
        hasAttachments: msg.hasAttachments || false,
        toAddresses: toEmailList(msg.toRecipients || []),
        ccAddresses: toEmailList(msg.ccRecipients || []),
        shopifyCustomerFound: false,
        shopifyLookupCompleted: false,
      });

      messagesCreated++;

    } catch (err: any) {
      logger.error({
        err,
        messageId: msg.id,
        subject: msg.subject,
        errorMessage: err?.message || String(err),
      }, "Failed to process message");
      errors++;
    }
  }

  // Update lastSyncAt in appConfiguration
  if (messagesCreated > 0 || messagesDuplicate > 0) {
    await api.appConfiguration.update(config.id, {
      lastSyncAt: now,
    });
  }

  const result = {
    ok: true,
    messagesCreated,
    messagesDuplicate,
    conversationsCreated,
    conversationsUpdated,
    errors,
    totalFetched: messages.length,
  };

  logger.info(result, "Sync completed");

  return result;
};

export const params = {
  top: { type: "number" },
  unreadOnly: { type: "boolean" },
  folderPath: { type: "string" },
};

export const options: ActionOptions = {
  timeoutMS: 300000,
};
