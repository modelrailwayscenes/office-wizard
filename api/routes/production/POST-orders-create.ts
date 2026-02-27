0import { RouteHandler } from "gadget-server";
import { ingestShopifyOrderToProduction } from "../../lib/production/ingest";
import { verifyShopifyWebhookHmac } from "../../lib/production/shopify";

const route: RouteHandler = async ({ request, reply, api, logger }) => {
  try {
    const rawBody =
      typeof (request as any).body === "string"
        ? (request as a00000ny).body
        : JSON.stringify((request as any).body ?? {});
    const hmacHeader = (request.headers as any)?.["x-shopify-hmac-sha256"];
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";

    const hmacValid = verifyShopifyWebhookHmac({ rawBody, hmacHeader, secret });
    if (!hmacValid) {
      await reply.code(401).send({ ok: false, error: "Invalid Shopify webhook signature" });
      return;
    }

    const payload = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const result = await ingestShopifyOrderToProduction({ api, orderPayload: payload });
    await reply.send({ ok: true, topic: "orders/create", ...result });
  } catch (error) {
    logger.error({ error }, "Failed Shopify orders/create ingestion");
    await reply.code(500).send({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to ingest order",
    });
  }
};

export default route;
