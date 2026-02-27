import type { ActionOptions } from "gadget-server";

const DEFAULT_RULES = [
  {
    name: "Invoice Attachment Detection",
    scope: "email",
    priority: 10,
    enabled: true,
    stopProcessing: false,
    conditions: {
      subjectContainsAny: ["invoice", "receipt", "vat", "statement"],
    },
    actions: {
      createDocument: true,
      createLedgerEntry: true,
      setStatus: "needs_approval",
      confidence: 0.9,
    },
  },
  {
    name: "Known Supplier Auto-Categorisation",
    scope: "categorisation",
    priority: 20,
    enabled: true,
    stopProcessing: false,
    conditions: {
      senderDomainIn: ["bigyellow.co.uk"],
    },
    actions: {
      setCategoryName: "Premises: Storage",
      setVatTreatment: "standard",
      confidence: 0.95,
    },
  },
  {
    name: "eBay Fee Detection",
    scope: "transaction",
    priority: 30,
    enabled: true,
    stopProcessing: false,
    conditions: {
      descriptionContainsAny: ["ebay"],
      amountLessThan: 0,
    },
    actions: {
      suggestCategoryName: "Platform Fees",
      suggestCounterparty: "eBay",
      confidence: 0.9,
    },
  },
  {
    name: "Shopify Payout Recognition",
    scope: "transaction",
    priority: 40,
    enabled: true,
    stopProcessing: false,
    conditions: {
      descriptionContainsAny: ["shopify", "payout"],
      amountGreaterThan: 0,
    },
    actions: {
      suggestCategoryName: "Sales Income",
      confidence: 0.9,
    },
  },
  {
    name: "Trusted Supplier Auto-Approve",
    scope: "approval",
    priority: 50,
    enabled: true,
    stopProcessing: false,
    conditions: {
      senderDomainIn: ["bigyellow.co.uk"],
    },
    actions: {
      autoApprove: true,
      confidence: 0.92,
    },
  },
];

export const run: ActionRun = async ({ api }) => {
  let created = 0;
  let updated = 0;
  for (const rule of DEFAULT_RULES) {
    const existing = await api.financeRule.findFirst({
      filter: { name: { equals: rule.name } },
      select: { id: true },
    } as any);
    if (existing?.id) {
      await api.financeRule.update(existing.id, rule as any);
      updated++;
    } else {
      await api.financeRule.create(rule as any);
      created++;
    }
  }
  return { ok: true, created, updated };
};

export const options: ActionOptions = {};
