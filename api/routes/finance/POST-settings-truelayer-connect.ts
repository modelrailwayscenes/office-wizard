import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const result = await api.getTrueLayerAuthUrl();
    await reply.send({ ok: true, ...result });
  } catch (error) {
    logger.error({ error }, "Finance TrueLayer connect route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "TrueLayer connect failed" });
  }
};

export default route;
