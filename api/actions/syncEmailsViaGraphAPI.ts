import type { ActionOptions } from "gadget-server";

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
      defaultInboxFolder: true,
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiresAt: true,
      lastSyncAt: true,
      ignoreLastSyncAt: true,
      notifyOnNewConversation: true,
      notifyOnCustomerReply: true,
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
        defaultInboxFolder: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
        lastSyncAt: true,
        ignoreLastSyncAt: true,
        notifyOnNewConversation: true,
        notifyOnCustomerReply: true,
      },
    });
  }

  if (!config?.microsoftAccessToken) throw new Error("No access token available");

  const top = Math.min(Math.max(Number((params as any)?.top ?? 100), 1), 100);
  const unreadOnly = Boolean((params as any)?.unreadOnly ?? false);
  const ignoreLastSyncAt = Boolean(
    (params as any)?.ignoreLastSyncAt ?? (config as any)?.ignoreLastSyncAt ?? false
  );
  const maxPages = Math.min(Math.max(Number((params as any)?.maxPages ?? 10), 1), 50);
  const inboxFolderId = String((config as any)?.defaultInboxFolder || "Inbox").trim() || "Inbox";
  const forceAllMessages = Boolean((params as any)?.forceAllMessages ?? false);
  const lastSyncAt = config.lastSyncAt;
  const syncCursorOverlapMinutes = 5;

  let totalFetched = 0;
  let inboundFetched = 0;
  let sentFetched = 0;
  let messagesCreated = 0;
  let messagesDuplicate = 0;
  let conversationsCreated = 0;
  let conversationsUpdated = 0;
  let errors = 0;
  let newestInboundSeenAt: Date | null = null;

  const selectFields = [
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
  ];

  const syncFolder = async ({
    folderId,
    orderByField,
    filterConditions,
    allowConversationCreate,
    countUnread,
    sourceLabel,
    isInboundSource,
  }: {
    folderId: string;
    orderByField: "receivedDateTime" | "sentDateTime";
    filterConditions: string[];
    allowConversationCreate: boolean;
    countUnread: boolean;
    sourceLabel: string;
    isInboundSource: boolean;
  }) => {
    const queryParams: Record<string, string> = {
      $top: String(top),
      $select: selectFields.join(","),
      $orderby: `${orderByField} desc`,
    };

    if (filterConditions.length > 0) {
      queryParams.$filter = filterConditions.join(" and ");
    }

    logger.info(
      { folder: sourceLabel, top, maxPages, filterConditions },
      "Fetching messages from Graph API"
    );

    let page = 0;
    const baseUrl =
      folderId === "__ALL_MESSAGES__"
        ? "https://graph.microsoft.com/v1.0/me/messages"
        : `https://graph.microsoft.com/v1.0/me/mailFolders/${encodeURIComponent(folderId)}/messages`;
    const paramsString = new URLSearchParams(queryParams).toString();
    let nextLink = `${baseUrl}?${paramsString}`;

    while (true) {
      const response = await fetch(nextLink, {
        headers: {
          Authorization: `Bearer ${config.microsoftAccessToken}`,
        },
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Graph API error ${response.status}: ${bodyText}`);
      }

      const payload = await response.json();
      const messages: any[] = payload?.value || [];
      totalFetched += messages.length;
      if (isInboundSource) {
        inboundFetched += messages.length;
      } else {
        sentFetched += messages.length;
      }

      logger.info({ count: messages.length, page: page + 1, folder: sourceLabel }, "Fetched messages from Graph API");

      for (const msg of messages) {
        try {
          if (!msg.id) {
            errors++;
            continue;
          }

          const existing = await api.emailMessage.findMany({
            filter: { messageId: { equals: msg.id } },
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
          const receivedDateTime =
            orderByField === "sentDateTime"
              ? (msg.sentDateTime || msg.receivedDateTime)
              : (msg.receivedDateTime || msg.sentDateTime);
          if (isInboundSource && receivedDateTime) {
            const parsed = new Date(receivedDateTime);
            if (!Number.isNaN(parsed.getTime()) && (!newestInboundSeenAt || parsed > newestInboundSeenAt)) {
              newestInboundSeenAt = parsed;
            }
          }

          const existingConversations = await api.conversation.findMany({
            filter: { graphConversationId: { equals: graphConversationId } },
            first: 1,
            select: {
              id: true,
              messageCount: true,
              unreadCount: true,
              firstMessageAt: true,
              latestMessageAt: true,
            },
          });

          let conversation = existingConversations?.[0] ?? null;

          const wasNewConversation = !conversation;
          if (!conversation) {
            if (!allowConversationCreate) {
              continue;
            }
            conversation = await api.conversation.create({
              conversationId: graphConversationId,
              graphConversationId,
              subject: normalizedSubject,
              primaryCustomerEmail: fromAddress,
              primaryCustomerName: fromName,
              firstMessageAt: receivedDateTime,
              latestMessageAt: receivedDateTime,
              messageCount: 1,
              unreadCount: msg.isRead ? 0 : 1,
              status: "new",
            } as any);

            conversationsCreated++;
          } else {
            const prevCount = Number(conversation.messageCount ?? 0);
            const prevUnread = Number(conversation.unreadCount ?? 0);

            const newMessageCount = prevCount + 1;
            const newUnreadCount = countUnread ? (msg.isRead ? prevUnread : prevUnread + 1) : prevUnread;

            const existingFirst = conversation.firstMessageAt ? new Date(conversation.firstMessageAt) : null;
            const existingLatest = conversation.latestMessageAt ? new Date(conversation.latestMessageAt) : null;
            const incoming = receivedDateTime ? new Date(receivedDateTime) : null;

            const newFirstMessageAt =
              existingFirst && incoming && existingFirst <= incoming ? conversation.firstMessageAt : receivedDateTime;
            const newLatestMessageAt =
              existingLatest && incoming && existingLatest >= incoming ? conversation.latestMessageAt : receivedDateTime;

            await api.conversation.update(conversation.id, {
              messageCount: newMessageCount,
              unreadCount: newUnreadCount,
              latestMessageAt: newLatestMessageAt,
              firstMessageAt: newFirstMessageAt,
            } as any);

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
            folderPath: sourceLabel,
            toAddresses: toEmailList(msg.toRecipients || []),
            ccAddresses: toEmailList(msg.ccRecipients || []),
            shopifyCustomerFound: false,
            shopifyLookupCompleted: false,
          } as any);

          messagesCreated++;

          if (sourceLabel !== "SentItems") {
            if (wasNewConversation && (config as any)?.notifyOnNewConversation) {
              await api.actionLog.create({
                action: "email_fetched",
                actionDescription: `New conversation created from ${fromAddress}`,
                performedAt: new Date(),
                performedBy: "system",
                performedVia: "api",
                conversation: { _link: conversation.id },
                metadata: {
                  kind: "new_conversation",
                  subject: msg.subject || "(No subject)",
                },
              } as any);
            } else if (!wasNewConversation && (config as any)?.notifyOnCustomerReply) {
              await api.actionLog.create({
                action: "email_fetched",
                actionDescription: `Customer reply received from ${fromAddress}`,
                performedAt: new Date(),
                performedBy: "system",
                performedVia: "api",
                conversation: { _link: conversation.id },
                metadata: {
                  kind: "customer_reply",
                  subject: msg.subject || "(No subject)",
                },
              } as any);
            }
          }
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
      const nextPage = payload?.["@odata.nextLink"];
      if (!nextPage || page >= maxPages) break;
      nextLink = nextPage;
    }
  };

  const inboxFilterConditions: string[] = [];
  if (unreadOnly) inboxFilterConditions.push("isRead eq false");

  if (lastSyncAt && !ignoreLastSyncAt) {
    const parsedLastSyncAt = new Date(lastSyncAt);
    if (!Number.isNaN(parsedLastSyncAt.getTime())) {
      // Add a small overlap window to avoid missing messages around cursor boundaries.
      const effectiveCursor = new Date(
        parsedLastSyncAt.getTime() - syncCursorOverlapMinutes * 60 * 1000
      );
      const boundedCursor =
        effectiveCursor > now ? new Date(now.getTime() - syncCursorOverlapMinutes * 60 * 1000) : effectiveCursor;
      inboxFilterConditions.push(`receivedDateTime ge ${boundedCursor.toISOString()}`);
    } else {
      logger.warn({ lastSyncAt }, "Invalid lastSyncAt cursor; syncing without date filter");
    }
  }

  const fetchedBeforePrimaryInboxSync = inboundFetched;
  if (forceAllMessages) {
    logger.warn(
      { inboxFilterConditions },
      "Force-all-messages mode enabled; bypassing configured inbox folder"
    );
    await syncFolder({
      folderId: "__ALL_MESSAGES__",
      orderByField: "receivedDateTime",
      filterConditions: inboxFilterConditions,
      allowConversationCreate: true,
      countUnread: true,
      sourceLabel: "ForcedAllMessages",
      isInboundSource: true,
    });
  } else {
    await syncFolder({
      folderId: inboxFolderId,
      orderByField: "receivedDateTime",
      filterConditions: inboxFilterConditions,
      allowConversationCreate: true,
      countUnread: true,
      sourceLabel: inboxFolderId,
      isInboundSource: true,
    });

    // Recovery fallback: if configured folder returns zero rows, query all messages.
    // This helps when mailbox rules move support emails out of the configured folder.
    if (inboundFetched === fetchedBeforePrimaryInboxSync) {
      logger.warn(
        { inboxFolderId, inboxFilterConditions },
        "Primary inbox folder returned zero messages; attempting all-messages fallback"
      );
      await syncFolder({
        folderId: "__ALL_MESSAGES__",
        orderByField: "receivedDateTime",
        filterConditions: inboxFilterConditions,
        allowConversationCreate: true,
        countUnread: true,
        sourceLabel: "AllMessagesFallback",
        isInboundSource: true,
      });
    }
  }

  const earliestConversation = await api.conversation.findMany({
    filter: { firstMessageAt: { isSet: true } } as any,
    sort: { firstMessageAt: "Ascending" },
    first: 1,
    select: { firstMessageAt: true } as any,
  });
  const earliestConversationAt = earliestConversation?.[0]?.firstMessageAt;
  if (earliestConversationAt) {
    const sentFilterConditions: string[] = [];
    sentFilterConditions.push(`sentDateTime ge ${new Date(earliestConversationAt).toISOString()}`);
    sentFilterConditions.push(`sentDateTime le ${now.toISOString()}`);

    await syncFolder({
      folderId: "SentItems",
      orderByField: "sentDateTime",
      filterConditions: sentFilterConditions,
      allowConversationCreate: false,
      countUnread: false,
      sourceLabel: "SentItems",
      isInboundSource: false,
    });
  } else {
    logger.info("No conversations found; skipping Sent Items sync");
  }

  if (inboundFetched > 0) {
    // Persist a forward-moving cursor based only on inbound sources.
    await api.appConfiguration.update(config.id, {
      lastSyncAt: newestInboundSeenAt ?? now,
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
    inboundFetched,
    sentFetched,
  };

  logger.info(result, "Sync completed");

  return result;
};

export const params = {
  top: { type: "number" },
  unreadOnly: { type: "boolean" },
  ignoreLastSyncAt: { type: "boolean" },
  forceAllMessages: { type: "boolean" },
  maxPages: { type: "number" },
};

export const options: ActionOptions = {
  timeoutMS: 300000,
  returnType: true,
};
