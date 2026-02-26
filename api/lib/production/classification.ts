type ProductionTypeRecord = {
  id: string;
  name?: string | null;
  category?: string | null;
  defaultPriorityBand?: "P0" | "P1" | "P2" | "P3" | null;
  defaultSlaDays?: number | null;
  batchingKey?: string | null;
  classificationRules?: any;
};

type ShopifyOrderLike = {
  id?: string | number;
  name?: string;
  order_number?: string | number;
  created_at?: string;
  cancelled_at?: string | null;
  updated_at?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  tags?: string;
  line_items?: any[];
};

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toIsoOrNull = (value?: string | null) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const keywordsMatch = (text: string, keywords: string[]) =>
  keywords.some((kw) => kw && text.includes(kw.toLowerCase()));

const getLineItemText = (lineItem: any) => {
  const title = lineItem?.title || "";
  const sku = lineItem?.sku || "";
  const variant = lineItem?.variant_title || "";
  const props = Array.isArray(lineItem?.properties)
    ? lineItem.properties
        .map((p: any) => `${p?.name || ""}:${p?.value || ""}`)
        .join(" ")
    : "";
  return normalize(`${title} ${sku} ${variant} ${props}`);
};

const extractProperty = (lineItem: any, keys: string[]) => {
  const props = Array.isArray(lineItem?.properties) ? lineItem.properties : [];
  for (const prop of props) {
    const name = normalize(prop?.name);
    if (keys.some((key) => name.includes(key))) {
      const value = String(prop?.value || "").trim();
      if (value) return value;
    }
  }
  return null;
};

const detectScale = (lineItem: any): "N" | "OO" | "O" | "HO" | "TT" | null => {
  const text = getLineItemText(lineItem).toUpperCase();
  if (text.includes(" HO ")) return "HO";
  if (text.includes(" TT ")) return "TT";
  if (text.includes(" OO ")) return "OO";
  if (text.includes(" O ")) return "O";
  if (text.includes(" N ")) return "N";
  return null;
};

const detectSides = (lineItem: any): "single" | "double" | null => {
  const text = getLineItemText(lineItem);
  if (text.includes("double")) return "double";
  if (text.includes("single")) return "single";
  return null;
};

const detectTextLines = (lineItem: any): "1" | "2" | null => {
  const linesValue = extractProperty(lineItem, ["line", "lines"]);
  if (!linesValue) return null;
  if (linesValue.includes("2")) return "2";
  if (linesValue.includes("1")) return "1";
  return null;
};

const computePriorityScore = ({
  daysToDeliver,
  isPersonalised,
  quantity,
  defaultBand,
}: {
  daysToDeliver: number;
  isPersonalised: boolean;
  quantity: number;
  defaultBand: "P0" | "P1" | "P2" | "P3";
}) => {
  const bandBase = defaultBand === "P0" ? 95 : defaultBand === "P1" ? 80 : defaultBand === "P2" ? 60 : 40;
  const urgency = Math.max(0, 14 - daysToDeliver) * 3;
  const personalisationBoost = isPersonalised ? 12 : 0;
  const quantityBoost = Math.min(quantity * 2, 15);
  return Math.max(5, Math.min(100, bandBase + urgency + personalisationBoost + quantityBoost));
};

const scoreToBand = (score: number): "P0" | "P1" | "P2" | "P3" => {
  if (score >= 90) return "P0";
  if (score >= 75) return "P1";
  if (score >= 55) return "P2";
  return "P3";
};

export const deriveDaysToDeliver = (orderDate?: string | null, dueBy?: string | null): number => {
  const start = orderDate ? new Date(orderDate) : new Date();
  const end = dueBy ? new Date(dueBy) : new Date(Date.now() + 3 * 86400000);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  return Math.max(0, Number.isFinite(days) ? days : 0);
};

export function deriveDueBy(orderCreatedAt?: string | null, defaultSlaDays?: number | null): string {
  const base = orderCreatedAt ? new Date(orderCreatedAt) : new Date();
  const days = Math.max(0, toNumber(defaultSlaDays, 3));
  return new Date(base.getTime() + days * 86400000).toISOString();
}

export function selectProductionType(
  lineItem: any,
  productionTypes: ProductionTypeRecord[]
): { type: ProductionTypeRecord | null; matchReason: string } {
  const text = getLineItemText(lineItem);
  const sorted = [...productionTypes].sort((a, b) => {
    const aPrio = toNumber(a?.classificationRules?.priority, 100);
    const bPrio = toNumber(b?.classificationRules?.priority, 100);
    return aPrio - bPrio;
  });

  for (const type of sorted) {
    const rules = type.classificationRules || {};
    const keywordsAny = Array.isArray(rules.keywordsAny) ? rules.keywordsAny.map(String) : [];
    if (keywordsAny.length > 0 && keywordsMatch(text, keywordsAny)) {
      return { type, matchReason: `Matched keywordsAny for ${type.name || type.id}` };
    }
  }

  const withPersonalisation = sorted.find(
    (type) => type.category === "personalised" || Boolean(type.classificationRules?.requiresPersonalisation)
  );
  if (withPersonalisation) {
    const hasCustomFields =
      Boolean(extractProperty(lineItem, ["text", "station", "name"])) ||
      Boolean(extractProperty(lineItem, ["colour", "color"])) ||
      Boolean(extractProperty(lineItem, ["style"]));
    if (hasCustomFields) {
      return { type: withPersonalisation, matchReason: "Detected custom properties; selected personalised type" };
    }
  }

  const fallback = sorted[0] || null;
  return { type: fallback, matchReason: fallback ? "Fallback to first active production type" : "No production type configured" };
}

export function classifyShopifyLineItem({
  order,
  lineItem,
  productionTypes,
}: {
  order: ShopifyOrderLike;
  lineItem: any;
  productionTypes: ProductionTypeRecord[];
}) {
  const { type, matchReason } = selectProductionType(lineItem, productionTypes);
  const defaultBand = (type?.defaultPriorityBand as "P0" | "P1" | "P2" | "P3" | null) || "P2";
  const dueBy = deriveDueBy(order.created_at || null, type?.defaultSlaDays ?? 3);
  const daysToDeliver = deriveDaysToDeliver(order.created_at || null, dueBy);

  const stationOrText =
    extractProperty(lineItem, ["station", "text", "name", "wording"]) ||
    extractProperty(lineItem, ["engraving", "line"]) ||
    null;
  const style = extractProperty(lineItem, ["style", "font", "typeface"]);
  const colour = extractProperty(lineItem, ["colour", "color", "paint"]);

  const isPersonalised =
    type?.category === "personalised" ||
    Boolean(type?.classificationRules?.requiresPersonalisation) ||
    Boolean(stationOrText);

  const quantityRequired = Math.max(1, toNumber(lineItem?.quantity, 1));
  const priorityScore = computePriorityScore({
    daysToDeliver,
    isPersonalised,
    quantity: quantityRequired,
    defaultBand,
  });
  const priorityBand = scoreToBand(priorityScore);

  const orderNumber = String(order.order_number || order.name || "").replace(/^#/, "");
  const externalRef = `shopify:${order.id}:${lineItem?.id || lineItem?.sku || lineItem?.variant_id || lineItem?.title || "item"}`;

  return {
    externalRef,
    orderNumber: orderNumber || `shopify-${order.id || "unknown"}`,
    orderDate: toIsoOrNull(order.created_at) || new Date().toISOString(),
    dueBy,
    daysToDeliver,
    priorityScore,
    priorityBand,
    source: "shopify_order" as const,
    marketplace: "shopify",
    productName: String(lineItem?.title || "Shopify item"),
    quantityRequired,
    sku: lineItem?.sku ? String(lineItem.sku) : null,
    stationOrText,
    style,
    colour,
    scale: detectScale(lineItem),
    sides: detectSides(lineItem),
    textLines: detectTextLines(lineItem),
    productionTypeId: type?.id || null,
    notes: JSON.stringify(
      {
        classification: {
          matchReason,
          productionTypeName: type?.name || null,
          category: type?.category || null,
        },
        webhook: {
          orderId: order.id || null,
          lineItemId: lineItem?.id || null,
          cancelledAt: order.cancelled_at || null,
          financialStatus: order.financial_status || null,
          fulfillmentStatus: order.fulfillment_status || null,
        },
      },
      null,
      2
    ),
  };
}
