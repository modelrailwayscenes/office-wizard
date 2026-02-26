import type { ActionOptions } from "gadget-server";

/**
 * backfillPlaybooks
 *
 * Upgrades existing template records into baseline "playbook-ready" records.
 * Fills missing playbook fields only; does not overwrite curated values.
 */

const DEFAULT_QUESTIONS = JSON.stringify([
  "What is the customer's primary issue?",
  "What action will we take next?",
  "What timeline should we communicate?",
]);

const DEFAULT_DONOT = JSON.stringify([
  "Do not use repetitive canned wording.",
  "Do not include signature/footer in AI body output.",
]);

const DEFAULT_STRUCTURE = JSON.stringify([
  "Acknowledge issue briefly",
  "Confirm known facts",
  "Provide next step and timeline",
  "Ask only necessary clarifying questions",
]);

const DEFAULT_REQUIRED_DATA = JSON.stringify(["customerName"]);

function toScenarioKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function uniqueScenarioKey(base: string, used: Set<string>): string {
  let candidate = base || "playbook";
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  let idx = 2;
  while (used.has(`${candidate}_${idx}`)) idx++;
  const unique = `${candidate}_${idx}`.slice(0, 64);
  used.add(unique);
  return unique;
}

export const params = {
  dryRun: { type: "boolean" },
  first: { type: "number" },
};

export const run: ActionRun = async ({ api, logger, params: actionParams }) => {
  const dryRun = Boolean((actionParams as any).dryRun);
  const first = Math.min(Math.max(Number((actionParams as any).first || 500), 1), 2000);

  const templates = await api.template.findMany({
    first,
    sort: { updatedAt: "Descending" } as any,
    select: {
      id: true,
      name: true,
      category: true,
      active: true,
      isActive: true,
      scenarioKey: true,
      priority: true,
      whenToUse: true,
      signalsToCheckJson: true,
      questionsToAnswerJson: true,
      doNotSayJson: true,
      toneGuidelines: true,
      structureHintsJson: true,
      requiredDataJson: true,
      defaultCategory: true,
      defaultPriorityBand: true,
      availableVariables: true,
    } as any,
  });

  const usedScenarioKeys = new Set(
    (templates || [])
      .map((t: any) => String(t?.scenarioKey || "").trim())
      .filter((v: string) => Boolean(v))
  );

  let scanned = 0;
  let updated = 0;
  const changes: Array<{ id: string; name: string; fields: string[] }> = [];

  for (const template of (templates || []) as any[]) {
    scanned++;
    const patch: Record<string, any> = {};
    const touched: string[] = [];

    if (!template.scenarioKey) {
      patch.scenarioKey = uniqueScenarioKey(toScenarioKey(template.name || "playbook"), usedScenarioKeys);
      touched.push("scenarioKey");
    }
    if (template.isActive === null || template.isActive === undefined) {
      patch.isActive = template.active ?? true;
      touched.push("isActive");
    }
    if (template.priority === null || template.priority === undefined) {
      patch.priority = 100;
      touched.push("priority");
    }
    if (!template.whenToUse) {
      const category = String(template.category || "general_enquiry").replace(/_/g, " ");
      patch.whenToUse = `Use when the customer's message matches ${category} context.`;
      touched.push("whenToUse");
    }
    if (!template.signalsToCheckJson) {
      patch.signalsToCheckJson = JSON.stringify([
        { id: "subject_match", type: "keyword_or_semantic", hint: template.name || "" },
        { id: "order_id_present", type: "regex", pattern: "\\b(MRS|NRS)[-\\s]?\\d{5}\\b" },
      ]);
      touched.push("signalsToCheckJson");
    }
    if (!template.questionsToAnswerJson) {
      patch.questionsToAnswerJson = DEFAULT_QUESTIONS;
      touched.push("questionsToAnswerJson");
    }
    if (!template.doNotSayJson) {
      patch.doNotSayJson = DEFAULT_DONOT;
      touched.push("doNotSayJson");
    }
    if (!template.toneGuidelines) {
      patch.toneGuidelines = "Professional, concise, empathetic, and non-repetitive.";
      touched.push("toneGuidelines");
    }
    if (!template.structureHintsJson) {
      patch.structureHintsJson = DEFAULT_STRUCTURE;
      touched.push("structureHintsJson");
    }
    if (!template.requiredDataJson) {
      const required = Array.isArray(template.availableVariables) && template.availableVariables.includes("orderNumber")
        ? ["customerName", "orderId"]
        : JSON.parse(DEFAULT_REQUIRED_DATA);
      patch.requiredDataJson = JSON.stringify(required);
      touched.push("requiredDataJson");
    }
    if (!template.defaultCategory && template.category) {
      patch.defaultCategory = template.category;
      touched.push("defaultCategory");
    }

    if (touched.length === 0) continue;

    if (!dryRun) {
      await api.template.update(template.id, patch);
    }

    updated++;
    changes.push({ id: template.id, name: template.name || template.id, fields: touched });
  }

  logger.info(
    { scanned, updated, dryRun, sample: changes.slice(0, 10) },
    "Playbook backfill complete"
  );

  return {
    ok: true,
    dryRun,
    scanned,
    updated,
    sample: changes.slice(0, 20),
  };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
