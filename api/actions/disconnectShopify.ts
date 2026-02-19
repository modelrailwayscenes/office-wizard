export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: { id: true } as any,
  });

  if (!config?.id) {
    throw new Error("No appConfiguration found");
  }

  logger.info("Disconnecting Shopify");

  await api.appConfiguration.update(config.id, {
    shopifyConnectionStatus: "disconnected",
  } as any);

  return { disconnected: true };
};

export const options = {
  triggers: { api: true },
};