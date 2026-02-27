import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const rows = await api.financeLedgerEntry.findMany({
      first: 2000,
      filter: { status: { in: ["approved", "locked"] } } as any,
      select: {
        id: true,
        grossAmount: true,
        category: { id: true, hmrcBucketId: true },
      } as any,
    });
    const totals = new Map<string, number>();
    for (const row of rows || []) {
      const key = String(row.category?.hmrcBucketId || "unmapped");
      totals.set(key, (totals.get(key) || 0) + Number(row.grossAmount || 0));
    }
    const out = Array.from(totals.entries()).map(([hmrcBucketId, total]) => ({
      hmrcBucketId,
      total: `£${total.toFixed(2)}`,
    }));
    await reply.send({ ok: true, generatedAt: new Date().toISOString(), rows: out });
  } catch (error) {
    logger.error({ error }, "Finance HMRC report route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance HMRC report failed" });
  }
};

export default route;
