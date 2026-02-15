import type { ActionOptions } from "gadget-server";

/**
 * Fetch new emails from Microsoft 365 and optionally run AI triage
 * 
 * This is a convenient wrapper that:
 * 1. Syncs emails from Outlook
 * 2. Optionally runs AI triage on new conversations
 * 
 * @param runTriage - Whether to automatically run AI triage after sync (default: true)
 * @param unreadOnly - Only fetch unread emails (default: false)
 * @param maxEmails - Maximum number of emails to fetch (default: 50, max: 100)
 */
export const run: ActionRun = async ({ params, logger, api }) => {
  // Parse parameters with defaults - using type assertion to avoid TS errors during build
  const fetchParams = params as any;
  const runTriage = fetchParams.runTriage !== false; // Default true
  const unreadOnly = Boolean(fetchParams.unreadOnly);
  const maxEmails = Math.min(Number(fetchParams.maxEmails) || 50, 100);

  logger.info({ runTriage, unreadOnly, maxEmails }, "Starting fetchEmails action");

  try {
    // Step 1: Sync emails from Microsoft 365
    logger.info("Syncing emails from Microsoft 365...");
    const syncResult = await api.syncEmailsViaGraphAPI({
      top: maxEmails,
      unreadOnly,
      folderPath: "Inbox",
    } as any); // Type assertion until Gadget generates types

    logger.info(syncResult, "Email sync completed");

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
        imported: syncResult.imported,
        skipped: syncResult.skipped,
        conversationsCreated: syncResult.conversationsCreated,
        conversationsUpdated: syncResult.conversationsUpdated,
        errors: syncResult.errors,
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
};

export const options: ActionOptions = {
  timeoutMS: 420000, // 7 minutes (sync + triage)
  triggers: {
    api: true,
  },
};
