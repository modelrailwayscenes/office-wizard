import { ActionOptions } from "gadget-server";
import { upsertProductionJobByExternalRef } from "../lib/production/idempotency";

export const params = {
  dryRun: { type: "boolean" },
};

async function fetchInventoryBySkus({
  domain,
  token,
  skus,
}: {
  domain: string;
  token: string;
  skus: string[];
}) {
  const out: Record<string, number> = {};
  for (const sku of skus) {
    const query = `#graphql
      query InventoryBySku($q: String!) {
        productVariants(first: 1, query: $q) {
          nodes { sku inventoryQuantity }
        }
      }`;
    const resp = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables: { q: `sku:${sku}` } }),
    });
    if (!resp.ok) continue;
    const json = await resp.json();
    const qty = json?.data?.productVariants?.nodes?.[0]?.inventoryQuantity;
    out[sku] = Number.isFinite(Number(qty)) ? Number(qty) : 0;
  }
  return out;
}

export const run = async ({ api, params, logger }: any) => {
  const dryRun = Boolean(params?.dryRun);
  const appConfig = await api.appConfiguration.findFirst({
    select: { id: true, shopifyStoreDomain: true, shopifyAccessToken: true },
  });

  const types = await api.productionType.findMany({
    first: 250,
    filter: { category: { equals: "standard_print" }, isActive: { equals: true } },
    select: { id: true, name: true, defaultPriorityBand: true, defaultSlaDays: true, classificationRules: true },
  });

  const thresholds: Array<{ productionTypeId: string; productionTypeName: string; sku: string; threshold: number; targetQty: number }> = [];
  for (const type of types || []) {
    const rules = type.classificationRules || {};
    const replenishment = rules?.replenishment || {};
    if (!replenishment?.enabled) continue;
    const skuThresholds = Array.isArray(replenishment?.skuThresholds) ? replenishment.skuThresholds : [];
    for (const entry of skuThresholds) {
      const sku = String(entry?.sku || "").trim();
      const threshold = Number(entry?.threshold || 0);
      const targetQty = Number(entry?.targetQty || threshold + 5);
      if (!sku || !Number.isFinite(threshold)) continue;
      thresholds.push({
        productionTypeId: type.id,
        productionTypeName: type.name || type.id,
        sku,
        threshold: Math.max(0, threshold),
        targetQty: Math.max(1, targetQty),
      });
    }
  }

  if (thresholds.length === 0) {
    return { ok: true, dryRun, created: 0, closed: 0, message: "No replenishment thresholds configured" };
  }

  const uniqueSkus = Array.from(new Set(thresholds.map((t) => t.sku)));
  const stockBySku =
    appConfig?.shopifyStoreDomain && appConfig?.shopifyAccessToken
      ? await fetchInventoryBySkus({
          domain: appConfig.shopifyStoreDomain,
          token: appConfig.shopifyAccessToken,
          skus: uniqueSkus,
        })
      : {};

  const actions: any[] = [];
  let created = 0;
  let closed = 0;
  for (const threshold of thresholds) {
    const currentStock = Number(stockBySku[threshold.sku] ?? 0);
    const externalRef = `inventory:${threshold.sku}`;
    const shouldCreate = currentStock <= threshold.threshold;
    const existing = await api.productionJob.findMany({
      first: 1,
      filter: { externalRef: { equals: externalRef } },
      select: { id: true, status: true },
    });
    const existingJob = (existing || [])[0];

    if (shouldCreate) {
      const qtyToMake = Math.max(1, threshold.targetQty - currentStock);
      if (!dryRun) {
        const result = await upsertProductionJobByExternalRef(api, {
          externalRef,
          source: "inventory_replenishment",
          marketplace: "shopify",
          productName: `Inventory Replenishment • ${threshold.sku}`,
          sku: threshold.sku,
          quantityRequired: qtyToMake,
          priorityBand: threshold.threshold <= 0 ? "P1" : "P2",
          priorityScore: threshold.threshold <= 0 ? 80 : 60,
          status: "queued",
          productionType: { _link: threshold.productionTypeId },
          orderNumber: `INV-${threshold.sku}`,
          orderDate: new Date().toISOString(),
          dueBy: new Date(Date.now() + 2 * 86400000).toISOString(),
          daysToDeliver: 2,
          notes: JSON.stringify(
            { replenishment: { sku: threshold.sku, threshold: threshold.threshold, currentStock, targetQty: threshold.targetQty } },
            null,
            2
          ),
        });
        if (result.created) created++;
      }
      actions.push({ sku: threshold.sku, action: "upsert", currentStock, threshold: threshold.threshold });
      continue;
    }

    if (existingJob && !["fulfilled", "cancelled"].includes(existingJob.status)) {
      if (!dryRun) {
        await api.productionJob.update({
          id: existingJob.id,
          status: "fulfilled",
          notes: JSON.stringify(
            { replenishment: { sku: threshold.sku, action: "auto_close", currentStock, threshold: threshold.threshold } },
            null,
            2
          ),
        });
      }
      closed++;
      actions.push({ sku: threshold.sku, action: "close", currentStock, threshold: threshold.threshold });
    }
  }

  logger.info({ created, closed, dryRun }, "Production replenishment run complete");
  return { ok: true, dryRun, created, closed, totalThresholds: thresholds.length, actions };
};

export const options: ActionOptions = {};
