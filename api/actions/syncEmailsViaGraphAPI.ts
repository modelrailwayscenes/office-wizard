import type { ActionOptions } from "gadget-server";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const asEmail = (addr: any): string | null => {
  return addr?.emailAddress?.address || null;
};

const asName = (addr: any): string | null => {
  return addr?.emailAddress?.name || null;
};

const toEmailList = (recipients: any[]): string[] => {
  if (!Array.isArray(recipients)) return [];
  return recipients.map((r) => asEmail(r)).filter((email): email is string => email !== null);
};

const getConversationKeyFromGraphMessage = (msg: any): string | null => {
  return msg?.conversationId || null;
};

export const run: ActionRun = async ({ logger, api, params }) => {
  let config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiresAt: true,
      lastSyncAt: true,
    },
  });

  if (!config) throw new Error("App configuration not found");

  const now = new Date();
  const expiresAt = config.microsoftTokenExpiresAt ? new Date(config.microsoftTokenExpiresAt) : null;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt <= fiveMinutesFromNow) {
    logger.info("Token expiring soon, refreshing");

    const refreshed = await api.refreshAccessToken();
    const refreshedResult: any = (refreshed as any)?.data ?? refreshed;

    if (!refreshedResult?.success) {
      throw new Error(refreshedResult?.error || "Token refresh failed");
    }

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

  if (!config?.microsoftAccessToken) throw new Error("No access token available");

  const client = Client.init({
    authProvider: (done: any) => {
      done(null, config.microsoftAccessToken);
    },
  });

  const top = Math.min(Math.max(Number((params as any)?.top ?? 100), 1), 100);
  const unreadOnly = Boolean((params as any)?.unreadOnly ?? false);
  const ignoreLastSyncAt = Boolean((params as any)?.ignoreLastSyncAt ?? false);
  const maxPages = Math.min(Math.max(Number((params as any)?.maxPages ?? 1), 1), 50);
  const lastSyncAt = config.lastSyncAt;

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

  const filterConditions: string[] = [];
  if (unreadOnly) filterConditions.push("isRead eq false");

  if (lastSyncAt && !ignoreLastSyncAt) {
    const lastSyncDate = new Date(lastSyncAt).toISOString();
    filterConditions.push(`receivedDateTime gt ${lastSyncDate}`);
  }

  if (filterConditions.length > 0) {
    query = query.filter(filterConditions.join(" and "));
  }

  logger.info(
    { top, unreadOnly, lastSyncAt, ignoreLastSyncAt, maxPages, filterConditions },
    "Fetching messages from Graph API"
  );

  let totalFetched = 0;
  let messagesCreated = 0;
  let messagesDuplicate = 0;
  let conversationsCreated = 0;
  let conversationsUpdated = 0;
  let errors = 0;

  let page = 0;
  let response = await query.get();

  while (true) {
    const messages: any[] = response?.value || [];
    totalFetched += messages.length;

    logger.info({ count: messages.length, page: page + 1 }, "Fetched messages from Graph API");

    for (const msg of messages) {
      try {
        if (!msg.id) {
          errors++;
          continue;
        }

        const existing = await api.emailMessage.findMany({
          filter: { externalMessageId: { equals: msg.id } },
          first: 1,
          select: { id: true },
        });

        if (existing?.length) {
          messagesDuplicate++;
          continue;
        }

        const graphConversationId = getConversationKeyFromGraphMessage(msg);
        if (!graphConversationId) {
          logger.warn({ messageId: msg.id }, "Message missing conversationId, skipping");
          errors++;
          continue;
        }

        const normalizedSubject = (msg.subject || "(No subject)")
          .replace(/^(Re:|Fwd?:)\s*/gi, "")
          .trim();

        const fromAddress = asEmail(msg.from);
        const fromName = asName(msg.from);
        const receivedDateTime = msg.receivedDateTime || msg.sentDateTime;

        const existingConversations = await api.conversation.findMany({
          filter: { graphConversationId: { equals: graphConversationId } },
          first: 1,
          select: {
            id: true,
            messageCount: true,
            unreadCount: true,
            firstMessageAt: true,
          },
        });

        let conversation = existingConversations?.[0] ?? null;

        if (!conversation) {
          conversation = await api.conversation.create({
            conversation: {
              graphConversationId,
              subject: normalizedSubject,
              primaryCustomerEmail: fromAddress,
              primaryCustomerName: fromName,
              firstMessageAt: receivedDateTime,
              latestMessageAt: receivedDateTime,
              messageCount: 1,
              unreadCount: msg.isRead ? 0 : 1,
              status: "new",
            },
            select: { id: true, messageCount: true, unreadCount: true, firstMessageAt: true },
          });

          conversationsCreated++;
        } else {
          const prevCount = Number(conversation.messageCount ?? 0);
          const prevUnread = Number(conversation.unreadCount ?? 0);

          const newMessageCount = prevCount + 1;
          const newUnreadCount = msg.isRead ? prevUnread : prevUnread + 1;

          const existingFirst = conversation.firstMessageAt ? new Date(conversation.firstMessageAt) : null;
          const incoming = receivedDateTime ? new Date(receivedDateTime) : null;

          const newFirstMessageAt =
            existingFirst && incoming && existingFirst <= incoming ? conversation.firstMessageAt : receivedDateTime;

          await api.conversation.update({
            id: conversation.id,
            conversation: {
              messageCount: newMessageCount,
              unreadCount: newUnreadCount,
              latestMessageAt: receivedDateTime,
              firstMessageAt: newFirstMessageAt,
            },
            select: { id: true },
          });

          conversationsUpdated++;
        }

        if (!fromAddress || !receivedDateTime) {
          logger.warn(
            {
              messageId: msg.id,
              subject: msg.subject,
              missing: { fromAddress: !fromAddress, receivedDateTime: !receivedDateTime },
            },
            "Skipping message - missing required fields"
          );
          errors++;
          continue;
        }

        await api.emailMessage.create({
          emailMessage: {
            conversation: { _link: conversation.id },
            messageId: msg.id,
            externalMessageId: msg.id,
            graphConversationId,
            internetMessageId: msg.internetMessageId || null,
            fromAddress,
            fromEmail: fromAddress,
            fromName,
            subject: msg.subject || "(No subject)",
            bodyPreview: msg.bodyPreview || null,
            bodyHtml: msg.body?.contentType === "html" ? msg.body.content : null,
            bodyText: msg.body?.contentType === "text" ? msg.body.content : msg.bodyPreview || null,
            receivedDateTime,
            sentDateTime: msg.sentDateTime || null,
            isRead: Boolean(msg.isRead),
            hasAttachments: Boolean(msg.hasAttachments),
            toAddresses: toEmailList(msg.toRecipients || []),
            ccAddresses: toEmailList(msg.ccRecipients || []),
            shopifyCustomerFound: false,
            shopifyLookupCompleted: false,
          },
          select: { id: true },
        });

        messagesCreated++;
      } catch (err: any) {
        logger.error(
          {
            err,
            messageId: msg?.id,
            subject: msg?.subject,
            errorMessage: err?.message || String(err),
          },
          "Failed to process message"
        );
        errors++;
      }
    }

    page += 1;
    const nextLink = response?.["@odata.nextLink"];
    if (!nextLink || page >= maxPages) break;
    response = await client.api(nextLink).get();
  }

  if (messagesCreated > 0 || messagesDuplicate > 0) {
    await api.appConfiguration.update({
      id: config.id,
      appConfiguration: {
        lastSyncAt: now,
      },
      select: { id: true },
    });
  }

  const result = {
    ok: true,
    messagesCreated,
    messagesDuplicate,
    conversationsCreated,
    conversationsUpdated,
    errors,
    totalFetched,
  };

  logger.info(result, "Sync completed");

  return result;
};

export const params = {
  top: { type: "number" },
  unreadOnly: { type: "boolean" },
  ignoreLastSyncAt: { type: "boolean" },
  maxPages: { type: "number" },
};

export const options: ActionOptions = {
  timeoutMS: 300000,
  returnType: true,
};