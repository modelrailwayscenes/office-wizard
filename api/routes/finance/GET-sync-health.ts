import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const config = await api.appConfiguration.findFirst({
      select: {
        microsoftConnectionStatus: true,
        lastSyncAt: true,
        trueLayerConnectionStatus: true,
        trueLayerLastSyncedAt: true,
        shopifyConnectionStatus: true,
      } as any,
    });
    const pendingReview = await api.financeLedgerEntry.findMany({
      first: 1,
      filter: { status: { equals: "needs_approval" } } as any,
      select: { id: true },
    });
    const unmatched = await api.financeTransaction.findMany({
      first: 1,
      filter: { status: { equals: "imported" } } as any,
      select: { id: true },
    });

    await reply.send({
      ok: true,
      generatedAt: new Date().toISOString(),
      providers: {
        microsoft: config?.microsoftConnectionStatus || "unknown",
        trueLayer: (config as any)?.trueLayerConnectionStatus || "unknown",
        shopify: config?.shopifyConnectionStatus || "unknown",
      },
      lastSync: {
        microsoft: config?.lastSyncAt || null,
        trueLayer: (config as any)?.trueLayerLastSyncedAt || null,
      },
      indicators: {
        hasPendingReview: (pendingReview || []).length > 0,
        hasUnmatchedTransactions: (unmatched || []).length > 0,
      },
    });
  } catch (error) {
    logger.error({ error }, "Finance sync health route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Sync health failed" });
  }
};

export default route;
