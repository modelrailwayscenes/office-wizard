import type { ActionOptions } from "gadget-server";
import { run as runSyncEmails } from "./syncEmailsViaGraphAPI";

export const run: ActionRun = async ({ logger, api }) => {
  logger.info("Starting mailbox polling");

  const config = await api.appConfiguration.findFirst({
    select: { autoTriageEnabled: true, workflowBatchProcessing: true } as any,
  });
  const allowBatchTriage =
    Boolean((config as any)?.autoTriageEnabled ?? true) &&
    Boolean((config as any)?.workflowBatchProcessing ?? true);

  const syncResult = await runSyncEmails({
    logger,
    api,
    params: {
      top: 50,
      unreadOnly: false,
    },
  } as any);

  const messagesCreated = (syncResult as any)?.messagesCreated ?? 0;

  if (messagesCreated > 0 && allowBatchTriage) {
    logger.info({ messagesCreated }, "Found new messages, triggering triage");
    await api.triageAllPending();
  } else if (messagesCreated > 0) {
    logger.info({ messagesCreated }, "New messages found but auto-triage is disabled");
  } else {
    logger.info("No new messages found");
  }

  return {
    ok: true,
    ...syncResult,
  };
};

export const options: ActionOptions = {
  timeoutMS: 300000,
  triggers: {
    scheduler: [
      {
        cron: "*/5 * * * *",
      },
    ],
  },
};