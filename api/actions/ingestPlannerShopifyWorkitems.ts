import type { ActionOptions } from "gadget-server";

const asArray = <T = any>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const scoreForBand = (band: string | null | undefined) => {
  switch (String(band || "").toUpperCase()) {
    case "P0":
      return 120;
    case "P1":
      return 95;
    case "P2":
      return 70;
    case "P3":
      return 45;
    default:
      return 40;
  }
};

export const params = {
  includeClosed: { type: "boolean" },
};

export const run: ActionRun = async ({ api, params: actionParams, logger }) => {
  const includeClosed = Boolean((actionParams as any)?.includeClosed);
  const appConfig = await api.appConfiguration.findFirst({
    select: { id: true, plannerWorkItemsJson: true } as any,
  });
  if (!appConfig?.id) throw new Error("App configuration not found");

  const jobs = await api.productionJob.findMany({
    first: 1000,
    sort: { orderDate: "Descending" } as any,
    filter: includeClosed
      ? ({ source: { equals: "shopify_order" } } as any)
      : ({
          source: { equals: "shopify_order" },
          status: { notIn: ["fulfilled", "cancelled"] },
        } as any),
    select: {
      id: true,
      source: true,
      externalRef: true,
      status: true,
      orderDate: true,
      dueBy: true,
      orderNumber: true,
      productName: true,
      stationOrText: true,
      priorityBand: true,
      quantityRequired: true,
      assignedToUser: { id: true, email: true } as any,
    } as any,
  });

  const existing = asArray<any>((appConfig as any)?.plannerWorkItemsJson);
  const byId = new Map(existing.map((w: any) => [w.id, w]));

  let created = 0;
  let updated = 0;
  for (const job of jobs || []) {
    const externalRef = String(job?.externalRef || `production:${job?.id}`);
    const itemId = `planner:${externalRef}`;
    const orderDate = job?.orderDate ? new Date(job.orderDate) : new Date();
    const isPersonalised = Boolean(String(job?.stationOrText || "").trim());
    const slaDays = isPersonalised ? 5 : 3;
    const fallbackDue = new Date(orderDate.getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();
    const dueAt = job?.dueBy || fallbackDue;

    const next = {
      id: itemId,
      externalRef,
      sourceModule: "shopify",
      sourceEntity: "productionJob",
      sourceEntityId: job?.id,
      title: job?.productName || job?.orderNumber || "Shopify order",
      workflowType: isPersonalised ? "personalised_sign" : "regular_order",
      orderNumber: job?.orderNumber || null,
      status: String(job?.status || "queued"),
      assigneeUserId: (job as any)?.assignedToUser?.id || null,
      assigneeLabel: (job as any)?.assignedToUser?.email || null,
      priorityBand: String(job?.priorityBand || "P3"),
      priorityScore: scoreForBand(job?.priorityBand),
      dueAt,
      slaDeadlineAt: dueAt,
      estimatedMinutes: isPersonalised ? 35 : 12,
      quantity: Number(job?.quantityRequired || 1),
      createdAt: new Date().toISOString(),
      explainability: {
        whyNow: isPersonalised
          ? "Personalised workflow has longer critical path and tighter QA dependency."
          : "Standard order should ship within 3 days SLA window.",
        whySequence: "Ingested from Shopify production flow and sorted by SLA/priority.",
      },
    };

    if (byId.has(itemId)) updated += 1;
    else created += 1;
    byId.set(itemId, next);
  }

  const merged = Array.from(byId.values())
    .sort((a: any, b: any) => Number(b?.priorityScore || 0) - Number(a?.priorityScore || 0))
    .slice(0, 2000);

  await api.appConfiguration.update(appConfig.id, {
    plannerWorkItemsJson: merged as any,
    plannerLastIngestAt: new Date(),
  } as any);

  logger.info({ created, updated, total: merged.length }, "Planner Shopify work items ingested");
  return { ok: true, created, updated, total: merged.length };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
