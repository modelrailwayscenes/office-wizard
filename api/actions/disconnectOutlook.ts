import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: { id: true },
  });

  if (!config) {
    return { ok: false, error: "No appConfiguration record found" };
  }

  await api.appConfiguration.update(config.id, {
    outlookConnected: false,
    microsoftConnectionStatus: null,      // ← was never being cleared
    microsoftLastVerifiedAt: null,        // ← reset verified timestamp too
    connectedMailbox: null,
    lastSyncAt: null,
    microsoftAccessToken: null,
    microsoftRefreshToken: null,
    microsoftTokenExpiresAt: null,
  } as any);

  logger.info("Microsoft 365 mailbox disconnected successfully");
  return { ok: true };
};

export const options: ActionOptions = {
  returnType: true,
};
