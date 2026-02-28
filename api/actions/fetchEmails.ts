import type { ActionOptions } from "gadget-server";
import { run as runSyncEmails } from "./syncEmailsViaGraphAPI";

/**
 * Fetch new emails from Microsoft 365 and optionally run AI triage
 * 
 * This is a convenient wrapper that:
 * 1. Syncs emails from Outlook
 * 2. Optionally runs AI triage on new conversations
 * 
 * @param runTriage - Whether to automatically run AI triage after sync (default: true)
 * @param unreadOnly - Only fetch unread emails (default: true)
 * @param maxEmails - Page size for each sync request (default: 100, max: 100)
 * @param maxPages - Maximum pages to fetch (default: 10)
 * @param ignoreLastSyncAt - Ignore last sync timestamp (default: from config)
 */
export const run: ActionRun = async ({ params, logger, api }) => {
  // Parse parameters with defaults - using type assertion to avoid TS errors during build
  const fetchParams = params as any;
  const unreadOnly = fetchParams.unreadOnly !== undefined ? Boolean(fetchParams.unreadOnly) : true;
  const maxEmails = Math.min(Number(fetchParams.maxEmails) || 100, 100);
  const maxPages = Math.min(Number(fetchParams.maxPages) || 10, 50);
  const forceAllMessages = fetchParams.forceAllMessages !== undefined ? Boolean(fetchParams.forceAllMessages) : false;

  const config = await api.appConfiguration.findFirst({
    select: { ignoreLastSyncAt: true, autoTriageEnabled: true } as any,
  });
  const runTriage =
    fetchParams.runTriage !== undefined
      ? Boolean(fetchParams.runTriage)
      : Boolean((config as any)?.autoTriageEnabled ?? true);
  const ignoreLastSyncAt =
    fetchParams.ignoreLastSyncAt !== undefined
      ? Boolean(fetchParams.ignoreLastSyncAt)
      : Boolean((config as any)?.ignoreLastSyncAt);

  logger.info(
    { runTriage, unreadOnly, maxEmails, maxPages, ignoreLastSyncAt, forceAllMessages },
    "Starting fetchEmails action"
  );

  try {
    // Step 1: Sync emails from Microsoft 365
    logger.info("Syncing emails from Microsoft 365...");
    const initialSyncResult = await runSyncEmails({
      logger,
      api,
      params: {
        top: maxEmails,
        unreadOnly,
        maxPages,
        ignoreLastSyncAt,
        forceAllMessages,
      },
    } as any);

    logger.info(initialSyncResult, "Email sync completed");

    // Self-heal path: if cursor-based sync returns no inbound rows, run a shallow
    // recovery sync without lastSyncAt to recover from stale/future cursors.
    let syncResult: any = initialSyncResult;
    let recoverySyncUsed = false;
    let deepRecoveryUsed = false;
    const initialInboundFetched = Number(
      (initialSyncResult as any)?.inboundFetched ?? (initialSyncResult as any)?.totalFetched ?? 0
    );
    if (!ignoreLastSyncAt && initialInboundFetched === 0) {
      recoverySyncUsed = true;
      logger.warn(
        { unreadOnly, maxEmails, maxPages },
        "Cursor sync returned zero inbound messages; running recovery sync without cursor"
      );

      const recoverySyncResult = await runSyncEmails({
        logger,
        api,
        params: {
          top: Math.min(maxEmails, 50),
          unreadOnly: false,
          maxPages: Math.min(maxPages, 2),
          ignoreLastSyncAt: true,
          forceAllMessages: false,
        },
      } as any);

      syncResult = {
        messagesCreated:
          Number((initialSyncResult as any)?.messagesCreated ?? 0) +
          Number((recoverySyncResult as any)?.messagesCreated ?? 0),
        messagesDuplicate:
          Number((initialSyncResult as any)?.messagesDuplicate ?? 0) +
          Number((recoverySyncResult as any)?.messagesDuplicate ?? 0),
        totalFetched:
          Number((initialSyncResult as any)?.totalFetched ?? 0) +
          Number((recoverySyncResult as any)?.totalFetched ?? 0),
        inboundFetched:
          Number((initialSyncResult as any)?.inboundFetched ?? 0) +
          Number((recoverySyncResult as any)?.inboundFetched ?? 0),
        sentFetched:
          Number((initialSyncResult as any)?.sentFetched ?? 0) +
          Number((recoverySyncResult as any)?.sentFetched ?? 0),
        conversationsCreated:
          Number((initialSyncResult as any)?.conversationsCreated ?? 0) +
          Number((recoverySyncResult as any)?.conversationsCreated ?? 0),
        conversationsUpdated:
          Number((initialSyncResult as any)?.conversationsUpdated ?? 0) +
          Number((recoverySyncResult as any)?.conversationsUpdated ?? 0),
        errors:
          Number((initialSyncResult as any)?.errors ?? 0) +
          Number((recoverySyncResult as any)?.errors ?? 0),
      };

      logger.info(
        { initialSyncResult, recoverySyncResult, mergedSyncResult: syncResult },
        "Recovery sync completed"
      );
    }

    // Deep self-heal path (manual fetch): if still nothing imported, run a direct
    // /me/messages recovery pass without cursor or folder constraints.
    const importedAfterRecovery = Number((syncResult as any)?.messagesCreated ?? 0);
    if (!forceAllMessages && importedAfterRecovery === 0) {
      deepRecoveryUsed = true;
      logger.warn(
        { unreadOnly, maxEmails, maxPages },
        "No messages imported after standard sync; running deep recovery against all messages"
      );

      const deepRecoveryResult = await runSyncEmails({
        logger,
        api,
        params: {
          top: Math.min(maxEmails, 100),
          unreadOnly: false,
          maxPages: Math.min(maxPages, 5),
          ignoreLastSyncAt: true,
          forceAllMessages: true,
        },
      } as any);

      syncResult = {
        messagesCreated:
          Number((syncResult as any)?.messagesCreated ?? 0) +
          Number((deepRecoveryResult as any)?.messagesCreated ?? 0),
        messagesDuplicate:
          Number((syncResult as any)?.messagesDuplicate ?? 0) +
          Number((deepRecoveryResult as any)?.messagesDuplicate ?? 0),
        totalFetched:
          Number((syncResult as any)?.totalFetched ?? 0) +
          Number((deepRecoveryResult as any)?.totalFetched ?? 0),
        inboundFetched:
          Number((syncResult as any)?.inboundFetched ?? 0) +
          Number((deepRecoveryResult as any)?.inboundFetched ?? 0),
        sentFetched:
          Number((syncResult as any)?.sentFetched ?? 0) +
          Number((deepRecoveryResult as any)?.sentFetched ?? 0),
        conversationsCreated:
          Number((syncResult as any)?.conversationsCreated ?? 0) +
          Number((deepRecoveryResult as any)?.conversationsCreated ?? 0),
        conversationsUpdated:
          Number((syncResult as any)?.conversationsUpdated ?? 0) +
          Number((deepRecoveryResult as any)?.conversationsUpdated ?? 0),
        errors:
          Number((syncResult as any)?.errors ?? 0) +
          Number((deepRecoveryResult as any)?.errors ?? 0),
      };

      logger.info(
        { deepRecoveryResult, mergedSyncResult: syncResult },
        "Deep recovery sync completed"
      );
    }

    // Step 2: Optionally run AI triage on new conversations
    let triageResult;
    if (runTriage && syncResult.conversationsCreated > 0) {
      logger.info({ newConversations: syncResult.conversationsCreated }, "Running AI triage on new conversations");
      
      triageResult = await api.runTriage({
        maxConversations: syncResult.conversationsCreated + 10, // Process new + a few existing
        forceReclassify: false,
      } as any); // Type assertion until Gadget generates types

      logger.info(triageResult, "AI triage completed");
    }

    return {
      success: true,
      sync: {
        imported: syncResult.messagesCreated ?? syncResult.imported ?? 0,
        skipped: syncResult.messagesDuplicate ?? syncResult.skipped ?? 0,
        totalFetched: syncResult.totalFetched ?? 0,
        inboundFetched: syncResult.inboundFetched ?? syncResult.totalFetched ?? 0,
        sentFetched: syncResult.sentFetched ?? 0,
        conversationsCreated: syncResult.conversationsCreated ?? 0,
        conversationsUpdated: syncResult.conversationsUpdated ?? 0,
        errors: syncResult.errors ?? 0,
        recoverySyncUsed,
        deepRecoveryUsed,
      },
      triage: triageResult ? {
        processed: triageResult.processedCount,
        highPriority: triageResult.highPriority,
        automationRecommended: triageResult.automationRecommended,
      } : null,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "Error in fetchEmails");
    throw error;
  }
};

export const params = {
  runTriage: { type: "boolean" },
  unreadOnly: { type: "boolean" },
  maxEmails: { type: "number" },
  maxPages: { type: "number" },
  ignoreLastSyncAt: { type: "boolean" },
  forceAllMessages: { type: "boolean" },
};

export const options: ActionOptions = {
  timeoutMS: 420000, // 7 minutes (sync + triage)
  triggers: {
    api: true,
  },
};
