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

    // Keep planner work items/schedule in sync after updates/cancellations.
    let plannerSync: { ingested?: boolean; planned?: boolean; error?: string } = {};
    try {
      await api.ingestPlannerShopifyWorkitems({ includeClosed: true } as any);
      plannerSync.ingested = true;
      await api.generatePlannerSchedule({ horizonDays: 3 } as any);
      plannerSync.planned = true;
    } catch (plannerError: any) {
      plannerSync = {
        ingested: false,
        planned: false,
        error: plannerError?.message || String(plannerError),
      };
      logger.warn({ plannerError }, "Planner sync failed after order lifecycle ingestion");
    }

    await reply.send({ ok: true, topic: "orders/updated_or_cancelled", ...result, plannerSync });
  } catch (error) {
    logger.error({ error }, "Failed Shopify order lifecycle sync");
    await reply.code(500).send({
      ok: false,
      error: error instanceof Error ? error.message : "Failed lifecycle sync",
    });
  }
};

export default route;
