import type { ActionOptions } from "gadget-server";

// ---------------------------------------------------------------------------
// triageAllPending
//
// Finds all conversations that haven't been triaged yet (status: "new", or
// lastTriagedAt is null) and calls runTriage on each one.
//
// Safe to run multiple times — already-triaged conversations are skipped.
// ---------------------------------------------------------------------------

export const run: ActionRun = async ({ logger, api, params }) => {
  const syncParams = params as any;
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
