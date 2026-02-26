import { classifyShopifyLineItem } from "./classification";
import { upsertProductionJobByExternalRef } from "./idempotency";

const getOrderNumber = (order: any) => String(order?.order_number || order?.name || "").replace(/^#/, "");

export async function ingestShopifyOrderToProduction({
  api,
  orderPayload,
}: {
  api: any;
  orderPayload: any;
}) {
  const lineItems = Array.isArray(orderPayload?.line_items) ? orderPayload.line_items : [];
  if (lineItems.length === 0) {
    return { created: 0, updated: 0, skipped: 0, details: [] as any[] };
  }

  const productionTypes = await api.productionType.findMany({
    first: 250,
    filter: { isActive: { equals: true } },
    select: {
      id: true,
      name: true,
      category: true,
      defaultPriorityBand: true,
      defaultSlaDays: true,
      batchingKey: true,
      classificationRules: true,
    },
  });

  const details: any[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const lineItem of lineItems) {
    const classified = classifyShopifyLineItem({
      order: orderPayload,
      lineItem,
      productionTypes: productionTypes || [],
    });

    if (!classified.externalRef || !classified.productName) {
      skipped++;
      continue;
    }

    const statusFromOrder = orderPayload?.cancelled_at ? "cancelled" : "queued";
    const payload = {
      externalRef: classified.externalRef,
      source: classified.source,
      marketplace: classified.marketplace,
      productName: classified.productName,
      quantityRequired: classified.quantityRequired,
      orderNumber: classified.orderNumber,
      orderDate: classified.orderDate,
      dueBy: classified.dueBy,
      daysToDeliver: classified.daysToDeliver,
      priorityBand: classified.priorityBand,
      priorityScore: classified.priorityScore,
      productionType: classified.productionTypeId ? { _link: classified.productionTypeId } : undefined,
      stationOrText: classified.stationOrText || null,
      style: classified.style || null,
      colour: classified.colour || null,
      scale: classified.scale || null,
      sides: classified.sides || null,
      textLines: classified.textLines || null,
      sku: classified.sku || null,
      notes: classified.notes || null,
      status: statusFromOrder,
    };

    const result = await upsertProductionJobByExternalRef(api, payload);
    if (result.created) created++;
    else updated++;
    details.push({
      jobId: result.id,
      orderNumber: classified.orderNumber,
      externalRef: classified.externalRef,
      created: result.created,
    });
  }

  return { created, updated, skipped, details };
}

export async function syncOrderLifecycleToProduction({
  api,
  orderPayload,
}: {
  api: any;
  orderPayload: any;
}) {
  const orderNumber = getOrderNumber(orderPayload);
  if (!orderNumber) return { updated: 0, reason: "missing order number" };

  const jobs = await api.productionJob.findMany({
    first: 250,
    filter: { orderNumber: { equals: orderNumber } },
    select: { id: true, status: true, externalRef: true },
  });

  const cancelled = Boolean(orderPayload?.cancelled_at);
  const fulfilled = String(orderPayload?.fulfillment_status || "").toLowerCase() === "fulfilled";
  const nextStatus = cancelled ? "cancelled" : fulfilled ? "fulfilled" : "queued";

  let updated = 0;
  for (const job of jobs || []) {
    if (job.status !== nextStatus) {
      await api.productionJob.update({
        id: job.id,
        status: nextStatus,
        notes: JSON.stringify(
          {
            lifecycleSync: {
              updatedAt: new Date().toISOString(),
              cancelledAt: orderPayload?.cancelled_at || null,
              fulfillmentStatus: orderPayload?.fulfillment_status || null,
            },
          },
          null,
          2
        ),
      });
      updated++;
    }
  }
  return { updated, nextStatus, orderNumber };
}
