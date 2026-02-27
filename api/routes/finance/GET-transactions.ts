import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const status = String((request.query as any)?.status || "all");
    const rows = await api.financeTransaction.findMany({
      first: 500,
      filter: status === "all" ? undefined : ({ status: { equals: status } } as any),
      sort: { postedAt: "Descending" } as any,
      select: {
        id: true,
        postedAt: true,
        amount: true,
        counterpartyRaw: true,
        descriptionRaw: true,
        status: true,
      } as any,
    });
    await reply.send({
      ok: true,
      rows: (rows || []).map((row) => ({
        id: row.id,
        date: row.postedAt || null,
        amount: `£${Number(row.amount || 0).toFixed(2)}`,
        merchant: row.counterpartyRaw || row.descriptionRaw || null,
        status: row.status,
      })),
    });
  } catch (error) {
    logger.error({ error }, "Finance transactions route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance transactions failed" });
  }
};

export default route;
