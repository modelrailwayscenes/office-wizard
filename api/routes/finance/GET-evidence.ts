import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const q = String((request.query as any)?.q || "");
    const rows = await api.financeDocument.findMany({
      first: 500,
      filter: q
        ? ({
            OR: [
              { supplierName: { matches: q } },
              { invoiceNumber: { matches: q } },
              { filename: { matches: q } },
            ],
          } as any)
        : undefined,
      sort: { capturedAt: "Descending" } as any,
      select: {
        id: true,
        type: true,
        supplierName: true,
        invoiceNumber: true,
        amount: true,
        source: true,
      } as any,
    });
    await reply.send({ ok: true, rows });
  } catch (error) {
    logger.error({ error }, "Finance evidence route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance evidence failed" });
  }
};

export default route;
