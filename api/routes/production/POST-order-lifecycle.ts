import { RouteHandler } from "gadget-server";
import { syncOrderLifecycleToProduction } from "../../lib/production/ingest";
import { verifyShopifyWebhookHmac } from "../../lib/production/shopify";

const route: RouteHandler = async ({ request, reply, api, logger }) => {
  try {
    const rawBody =
      typeof (request as any).body === "string"
        ? (request as any).body
        : JSON.stringify((request as any).body ?? {});
    const hmacHeader = (request.headers as any)?.["x-shopify-hmac-sha256"];
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";

    const hmacValid = verifyShopifyWebhookHmac({ rawBody, hmacHeader, secret });
    if (!hmacValid) {
      await reply.code(401).send({ ok: false, error: "Invalid Shopify webhook signature" });
      return;
    }

    const payload = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const result = await syncOrderLifecycleToProduction({ api, orderPayload: payload });
    await reply.send({ ok: true, topic: "orders/updated_or_cancelled", ...result });
  } catch (error) {
    logger.error({ error }, "Failed Shopify order lifecycle sync");
    await reply.code(500).send({
      ok: false,
      error: error instanceof Error ? error.message : "Failed lifecycle sync",
    });
  }
};

export default route;
