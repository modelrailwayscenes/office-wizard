import type { ActionOptions } from "gadget-server";

// ---------------------------------------------------------------------------
// triageAllPending
//
// Finds all conversations that haven't been triaged yet (status: "new", or
// lastTriagedAt is null) and calls runTriage on each one.
//
// Safe to run multiple times — already-triaged conversations are skipped.
// ---------------------------------------------------------------------------

export const run: ActionRun = async ({ logger, api, params, session }) => {
  const syncParams = params as any;
  const userRef = session?.get("user");
  const triggeredBy =
    typeof userRef === "string"
      ? userRef
      : userRef?._link || userRef?.id || "system";
  const actorUserId =
    typeof userRef === "string" ? userRef : userRef?._link || userRef?.id || null;
  const auditSource = session ? "admin_ui" : "system";
  const config = await api.appConfiguration.findFirst({
    select: {
      batchSize: true,
      maxEmailsPerTriage: true,
      bulkActionsEnabled: true,
      workflowBatchProcessing: true,
    } as any,
  });
  const bulkActionsEnabled = (config as any)?.bulkActionsEnabled ?? true;
  const workflowBatchProcessing = (config as any)?.workflowBatchProcessing ?? true;
  if (!bulkActionsEnabled || !workflowBatchProcessing) {
    logger.info(
      { bulkActionsEnabled, workflowBatchProcessing },
      "Bulk triage skipped because batch processing is disabled"
    );
    return { success: false, processed: 0, skipped: 0, errors: 0 };
  }

  const configBatchSize = Number((config as any)?.batchSize) || 50;
  const maxEmailsPerTriage = Number((config as any)?.maxEmailsPerTriage) || 500;
  const batchSize = Math.min(Number(syncParams.batchSize) || configBatchSize, maxEmailsPerTriage, 100);
  const forceRetriage = Boolean(syncParams.forceRetriage); // re-triage even if already done

  logger.info({ batchSize, forceRetriage }, "Starting bulk triage");

  const writeErrorComment = async (conversationId: string, error: string) => {
    try {
      await api.internal.aiComment.create({
        conversation: { _link: conversationId },
        kind: "error",
        source: auditSource,
        content: `Bulk triage failed for this conversation: ${error}`,
        model: null,
        user: actorUserId ? { _link: actorUserId } : undefined,
        metaJson: JSON.stringify({
          batchSize,
          forceRetriage,
          performedBy: triggeredBy,
        }),
      });
    } catch (err: any) {
      logger.warn({ conversationId, error: err?.message }, "Failed to write aiComment error record");
    }
  };

  // Find pending conversations
  const filter = forceRetriage
    ? {} // all conversations
    : { status: { equals: "new" } }; // only untriaged

  const conversations = await api.conversation.findMany({
    filter: filter as any,
    select: { id: true, subject: true, status: true, lastTriagedAt: true } as any,
    first: batchSize,
    sort: { createdAt: "Ascending" },
  });

  logger.info({ count: conversations.length }, "Found conversations to triage");

  if (conversations.length === 0) {
    await api.actionLog.create({
      action: "bulk_action",
      actionDescription: "Triage run completed (no conversations)",
      performedAt: new Date(),
      performedBy: triggeredBy,
      performedVia: session ? "web_ui" : "api",
      bulkActionCount: 0,
      metadata: {
        kind: "triage_run",
        processed: 0,
        skipped: 0,
        errors: 0,
        batchSize,
        forceRetriage,
      },
    } as any);
    return { success: true, processed: 0, skipped: 0, errors: 0 };
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{ conversationId: string; error: string }> = [];

  for (const conv of conversations) {
    // Skip if already triaged and forceRetriage is false
    if (!forceRetriage && (conv as any).lastTriagedAt) {
      skipped++;
      continue;
    }

    try {
      await api.runTriage({ conversationId: conv.id });
      processed++;
      logger.debug({ conversationId: conv.id, subject: conv.subject }, "Triaged");
    } catch (err: any) {
      logger.error({ conversationId: conv.id, error: err.message }, "Triage failed");
      errors++;
      errorDetails.push({ conversationId: conv.id, error: err.message });
      await writeErrorComment(conv.id, err?.message || "Unknown error");
    }
  }

  const summary = {
    success: true,
    processed,
    skipped,
    errors,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  };

  logger.info(summary, "Bulk triage complete");
  await api.actionLog.create({
    action: "bulk_action",
    actionDescription: `Triage run completed: processed ${processed}, skipped ${skipped}, errors ${errors}`,
    performedAt: new Date(),
    performedBy: triggeredBy,
    performedVia: session ? "web_ui" : "api",
    bulkActionCount: processed,
    metadata: {
      kind: "triage_run",
      processed,
      skipped,
      errors,
      batchSize,
      forceRetriage,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    },
  } as any);
  return summary;
};

export const params = {
  batchSize: { type: "number" },
  forceRetriage: { type: "boolean" },
};

export const options: ActionOptions = {
  timeoutMS: 600000, // 10 minutes for large batches
  triggers: { api: true },
};
