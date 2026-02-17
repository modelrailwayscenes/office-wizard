import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ logger, api }) => {
  logger.info("Starting mailbox polling");

  const syncResult = await api.syncEmailsViaGraphAPI({
    top: 50,
    unreadOnly: false,
  });

  const messagesCreated = (syncResult as any)?.messagesCreated ?? 0;

  if (messagesCreated > 0) {
    logger.info({ messagesCreated }, "Found new messages, triggering triage");
    await api.triageAllPending();
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