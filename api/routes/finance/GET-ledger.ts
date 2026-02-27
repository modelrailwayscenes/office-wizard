import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const status = String((request.query as any)?.status || "all");
    const rows = await api.financeLedgerEntry.findMany({
      first: 500,
      filter: status === "all" ? undefined : ({ status: { equals: status } } as any),
      sort: { entryDate: "Descending" } as any,
      select: {
        id: true,
        entryDate: true,
        description: true,
        grossAmount: true,
        status: true,
        category: { id: true, name: true },
      } as any,
    });

    await reply.send({
      ok: true,
      rows: (rows || []).map((row) => ({
        id: row.id,
        date: row.entryDate || null,
        description: row.description || null,
        category: row.category?.name || null,
        gross: row.grossAmount != null ? `£${Number(row.grossAmount).toFixed(2)}` : null,
        status: row.status,
      })),
    });
  } catch (error) {
    logger.error({ error }, "Finance ledger route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance ledger failed" });
  }
};

export default route;
