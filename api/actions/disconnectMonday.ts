export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: { id: true } as any,
  });

  if (!config?.id) {
    throw new Error("No appConfiguration found");
  }

  logger.info("Disconnecting monday.com");

  await api.appConfiguration.update(config.id, {
    mondayConnectionStatus: "disconnected",
  } as any);

  return { disconnected: true };
};

export const options = {
  triggers: { api: true },
};