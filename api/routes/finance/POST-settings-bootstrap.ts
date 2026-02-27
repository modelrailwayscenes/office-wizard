import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const categories = await api.seedFinanceDefaultCategories();
    const periods = await api.generateFinancePeriods({ years: 2 });
    const rules = await api.seedFinanceRules();
    await reply.send({ ok: true, categories, periods, rules });
  } catch (error) {
    logger.error({ error }, "Finance bootstrap route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance bootstrap failed" });
  }
};

export default route;
