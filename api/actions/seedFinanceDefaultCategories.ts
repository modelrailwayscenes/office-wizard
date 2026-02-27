import type { ActionOptions } from "gadget-server";

const DEFAULT_CATEGORIES = [
  { name: "Sales Income", direction: "income", hmrcBucketId: "turnover", vatTreatment: "unknown" },
  { name: "Platform Fees", direction: "expense", hmrcBucketId: "cost_of_goods", vatTreatment: "unknown" },
  { name: "Premises: Storage", direction: "expense", hmrcBucketId: "premises_running_costs", vatTreatment: "standard" },
  { name: "Postage & Shipping", direction: "expense", hmrcBucketId: "office_property_costs", vatTreatment: "unknown" },
  { name: "Software & Subscriptions", direction: "expense", hmrcBucketId: "office_property_costs", vatTreatment: "unknown" },
  { name: "Professional Services", direction: "expense", hmrcBucketId: "legal_financial_costs", vatTreatment: "unknown" },
  { name: "Travel", direction: "expense", hmrcBucketId: "travel_costs", vatTreatment: "unknown" },
  { name: "Advertising & Marketing", direction: "expense", hmrcBucketId: "advertising_costs", vatTreatment: "unknown" },
];

export const run: ActionRun = async ({ api }) => {
  const created: string[] = [];
  const updated: string[] = [];

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await api.financeCategory.findFirst({
      filter: { name: { equals: cat.name } },
      select: { id: true },
    } as any);
    if (existing?.id) {
      await api.financeCategory.update(existing.id, {
        direction: cat.direction,
        hmrcBucketId: cat.hmrcBucketId,
        vatTreatment: cat.vatTreatment,
        active: true,
      } as any);
      updated.push(cat.name);
    } else {
      await api.financeCategory.create({
        name: cat.name,
        direction: cat.direction,
        hmrcBucketId: cat.hmrcBucketId,
        vatTreatment: cat.vatTreatment,
        active: true,
      } as any);
      created.push(cat.name);
    }
  }

  return { ok: true, createdCount: created.length, updatedCount: updated.length, created, updated };
};

export const options: ActionOptions = {};
