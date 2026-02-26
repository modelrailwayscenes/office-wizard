import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ request, reply, api, logger }) => {
  try {
    const status = (request.query as any)?.status ? String((request.query as any).status) : null;
    const q = (request.query as any)?.q ? String((request.query as any).q) : null;
    const limit = Math.min(Number((request.query as any)?.limit || 100), 250);
    const filterClauses: any[] = [];
    if (status) filterClauses.push({ status: { equals: status } });
    if (q) {
      filterClauses.push({
        OR: [
          { productName: { matches: q } },
          { stationOrText: { matches: q } },
          { orderNumber: { matches: q } },
          { sku: { matches: q } },
        ],
      });
    }
    const filter = filterClauses.length > 0 ? { AND: filterClauses } : undefined;

    const jobs = await api.productionJob.findMany({
      first: limit,
      sort: [{ priorityScore: "Descending" }, { dueBy: "Ascending" }],
      filter,
      select: {
        id: true,
        productName: true,
        stationOrText: true,
        orderNumber: true,
        status: true,
        priorityBand: true,
        priorityScore: true,
        dueBy: true,
        source: true,
        assignedTo: { id: true, email: true },
        batch: { id: true, name: true, status: true },
        updatedAt: true,
      },
    });
    await reply.send({ ok: true, count: (jobs || []).length, jobs });
  } catch (error) {
    logger.error({ error }, "Failed to fetch production jobs");
    await reply.code(500).send({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to fetch jobs",
    });
  }
};

export default route;
