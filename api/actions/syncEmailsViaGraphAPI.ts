// FIXED syncEmailsViaGraphAPI.ts - Proper TypeScript error handling
// This works with YOUR actual schema

import type { ActionOptions } from "gadget-server";

type GraphMessage = {
  id: string;
  subject?: string;
  receivedDateTime?: string;
  sentDateTime?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  isRead?: boolean;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  conversationId?: string;
  internetMessageId?: string;
  hasAttachments?: boolean;
};

type GraphResponse = {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
};

export const run: ActionRun = async ({ logger, api, params }) => {
  // Get Microsoft access token
  let config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiresAt: true,
    },
  });

  if (!config) {
    throw new Error("App configuration not found");
  }

  // Refresh token if needed
  const now = new Date();
  const expiresAt = config.microsoftTokenExpiresAt ? new Date(config.microsoftTokenExpiresAt) : null;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt <= fiveMinutesFromNow) {
    logger.info("Refreshing token");
    await api.refreshAccessToken();
    config = await api.appConfiguration.findFirst({
      select: {
        id: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
      },
    });
  }

  if (!config?.microsoftAccessToken) {
    throw new Error("No access token");
  }

  // Parameters
  const top = Number((params as any)?.top ?? 100);
  const filterUnreadOnly = Boolean((params as any)?.unreadOnly ?? false);

  // Build Graph API URL
  const queryParams = [
    `$top=${Math.min(Math.max(top, 1), 100)}`,
    `$select=id,subject,receivedDateTime,sentDateTime,from,isRead,bodyPreview,body,conversationId,internetMessageId,hasAttachments`,
    `$orderby=receivedDateTime desc`,
  ];

  if (filterUnreadOnly) {
    queryParams.push(`$filter=isRead eq false`);
  }

  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${queryParams.join('&')}`;

  logger.info({ url, top }, "Fetching emails");

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.microsoftAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status}`);
  }

  const data: GraphResponse = await response.json();
  const messages = data.value || [];

  logger.info({ count: messages.length }, "Fetched messages");

  let created = 0;
  let updated = 0;
  let conversationsCreated = 0;
  let errors = 0;

  for (const msg of messages) {
    try {
      const normalizedSubject = (msg.subject || "(No subject)").replace(/^(Re:|Fwd?:)\s*/gi, '').trim();

      // Find existing conversation
      let conversation = null;
      
      if (msg.conversationId) {
        const convs = await api.conversation.findMany({
          filter: { conversationId: { equals: msg.conversationId } },
          first: 1,
        });
        if (convs && convs.length > 0) {
          conversation = convs[0];
        }
      }

      // Create new conversation if not found
      if (!conversation) {
        conversation = await api.conversation.create({
          conversationId: msg.conversationId || `generated-${Date.now()}-${Math.random()}`,
          externalConversationId: msg.conversationId,
          subject: normalizedSubject,
          primaryCustomerEmail: msg.from?.emailAddress?.address,
          primaryCustomerName: msg.from?.emailAddress?.name,
          firstMessageAt: msg.receivedDateTime,
          latestMessageAt: msg.receivedDateTime,
          messageCount: 1,
          unreadCount: msg.isRead ? 0 : 1,
        });
        conversationsCreated++;
      } else {
        // Update existing
        await api.conversation.update(conversation.id, {
          latestMessageAt: msg.receivedDateTime,
          messageCount: (conversation.messageCount || 0) + 1,
          unreadCount: msg.isRead ? conversation.unreadCount : (conversation.unreadCount || 0) + 1,
        });
      }

      // Check if message exists
      let existingMsg = null;
      if (msg.id) {
        const msgs = await api.emailMessage.findMany({
          filter: { externalMessageId: { equals: msg.id } },
          first: 1,
        });
        if (msgs && msgs.length > 0) {
          existingMsg = msgs[0];
        }
      }

      if (!existingMsg) {
        // Create email message
        await api.emailMessage.create({
          externalMessageId: msg.id,
          internetMessageId: msg.internetMessageId,
          conversation: { _link: conversation.id },
          subject: msg.subject || "(No subject)",
          fromEmail: msg.from?.emailAddress?.address,
          fromName: msg.from?.emailAddress?.name,
          receivedAt: msg.receivedDateTime,
          sentAt: msg.sentDateTime,
          bodyPreview: msg.bodyPreview,
          bodyHtml: msg.body?.contentType === 'html' ? msg.body.content : null,
          bodyText: msg.body?.contentType === 'text' ? msg.body.content : msg.bodyPreview,
          isRead: msg.isRead,
          hasAttachments: msg.hasAttachments,
        });
        created++;
      } else {
        await api.emailMessage.update(existingMsg.id, {
          isRead: msg.isRead,
        });
        updated++;
      }

    } catch (err: any) {
      // ✅ Fixed TypeScript error by typing as 'any'
      logger.error({ 
        err, 
        messageId: msg.id,
        subject: msg.subject,
        errorMessage: err?.message || String(err)
      }, "Failed to process message");
      errors++;
    }
  }

  const result = {
    ok: true,
    fetched: messages.length,
    created,
    updated,
    conversationsCreated,
    errors,
    hasMore: !!data["@odata.nextLink"],
  };

  logger.info(result, "Sync complete");

  return result;
};

export const options: ActionOptions = {
  timeoutMS: 300000,
};
