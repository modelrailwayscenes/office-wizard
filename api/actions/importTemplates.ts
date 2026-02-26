import { ActionOptions } from "gadget-server";

const REQUIRED_FIELDS = ["name", "bodyText", "category", "safetyLevel", "availableVariables"] as const;
const VALID_CATEGORIES = new Set([
  "tracking_request",
  "product_instructions",
  "opening_hours",
  "general_faq",
  "request_more_info",
  "refund_policy",
  "delivery_info",
  "custom",
]);
const VALID_SAFETY_LEVELS = new Set(["safe", "moderate", "risky"]);

type TemplateRow = {
  name?: string;
  scenarioKey?: string;
  isActive?: boolean;
  priority?: number;
  whenToUse?: string;
  signalsToCheckJson?: string;
  questionsToAnswerJson?: string;
  doNotSayJson?: string;
  toneGuidelines?: string;
  structureHintsJson?: string;
  requiredDataJson?: string;
  defaultCategory?: string;
  defaultPriorityBand?: string;
  slaHours?: number;
  category?: string;
  subject?: string;
  bodyText?: string;
  availableVariables?: unknown;
  requiredVariables?: unknown;
  safetyLevel?: string;
  active?: boolean;
  description?: string;
  autoSendEnabled?: boolean;
};

export const params = {
  format: { type: "string" }, // 'json' | 'csv'
  content: { type: "string" },
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(content: string): TemplateRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const nameIdx = header.indexOf("name");
  const categoryIdx = header.indexOf("category");
  const subjectIdx = header.indexOf("subject");
  const bodyTextIdx = header.indexOf("bodyText");
  const availableVariablesIdx = header.indexOf("availableVariables");
  const requiredVariablesIdx = header.indexOf("requiredVariables");
  const safetyLevelIdx = header.indexOf("safetyLevel");
  const activeIdx = header.indexOf("active");
  const descriptionIdx = header.indexOf("description");
  const autoSendEnabledIdx = header.indexOf("autoSendEnabled");

  const rows: TemplateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const get = (idx: number) => (idx >= 0 && idx < values.length ? values[idx]?.trim() ?? "" : "");

    const parseJson = (s: string): unknown => {
      if (!s) return [];
      try {
        const v = JSON.parse(s);
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    };

    const parseBool = (s: string): boolean =>
      s === "true" || s === "1" || s.toLowerCase() === "yes";

    rows.push({
      name: get(nameIdx) || undefined,
      category: get(categoryIdx) || undefined,
      subject: get(subjectIdx) || undefined,
      bodyText: get(bodyTextIdx) || undefined,
      availableVariables: parseJson(get(availableVariablesIdx)),
      requiredVariables: parseJson(get(requiredVariablesIdx)),
      safetyLevel: get(safetyLevelIdx) || undefined,
      active: parseBool(get(activeIdx)),
      description: get(descriptionIdx) || undefined,
      autoSendEnabled: parseBool(get(autoSendEnabledIdx)),
    });
  }
  return rows;
}

function validateRow(row: TemplateRow, index: number): string | null {
  for (const field of REQUIRED_FIELDS) {
    const val = row[field];
    if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
      return `Row ${index + 1}: missing required field '${field}'`;
    }
  }

  if (row.name && typeof row.name === "string" && !row.name.trim()) {
    return `Row ${index + 1}: name cannot be empty`;
  }

  if (row.category && !VALID_CATEGORIES.has(row.category)) {
    return `Row ${index + 1}: invalid category '${row.category}'`;
  }

  if (row.safetyLevel && !VALID_SAFETY_LEVELS.has(row.safetyLevel)) {
    return `Row ${index + 1}: invalid safetyLevel '${row.safetyLevel}'`;
  }

  if (row.availableVariables !== undefined && !Array.isArray(row.availableVariables)) {
    return `Row ${index + 1}: availableVariables must be an array`;
  }

  return null;
}

function normalizeRow(row: TemplateRow): Record<string, unknown> {
  const availableVariables = Array.isArray(row.availableVariables)
    ? row.availableVariables
    : [];
  const requiredVariables = Array.isArray(row.requiredVariables)
    ? row.requiredVariables
    : [];

  const scenarioKey =
    (row.scenarioKey || row.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || null;

  return {
    name: String(row.name ?? "").trim(),
    scenarioKey,
    isActive: row.isActive ?? row.active ?? true,
    priority: typeof row.priority === "number" ? row.priority : 100,
    whenToUse: row.whenToUse ?? null,
    signalsToCheckJson: row.signalsToCheckJson ?? null,
    questionsToAnswerJson: row.questionsToAnswerJson ?? null,
    doNotSayJson: row.doNotSayJson ?? null,
    toneGuidelines: row.toneGuidelines ?? null,
    structureHintsJson: row.structureHintsJson ?? null,
    requiredDataJson: row.requiredDataJson ?? null,
    defaultCategory: row.defaultCategory ?? null,
    defaultPriorityBand: row.defaultPriorityBand ?? null,
    slaHours: typeof row.slaHours === "number" ? row.slaHours : null,
    category: row.category ?? "custom",
    subject: row.subject ?? "",
    bodyText: String(row.bodyText ?? "").trim(),
    availableVariables: availableVariables.length > 0 ? availableVariables : ["customerName", "orderNumber", "company_name"],
    requiredVariables,
    safetyLevel: row.safetyLevel ?? "safe",
    active: row.active ?? true,
    description: row.description ?? null,
    autoSendEnabled: row.autoSendEnabled ?? false,
  };
}

export const run: ActionRun = async ({ params: actionParams, api, logger }) => {
  const format = (actionParams.format as string)?.toLowerCase();
  const content = actionParams.content as string;

  if (!format || (format !== "json" && format !== "csv")) {
    return {
      created: 0,
      updated: 0,
      errors: ["format must be 'json' or 'csv'"],
    };
  }

  if (!content || typeof content !== "string") {
    return {
      created: 0,
      updated: 0,
      errors: ["content is required"],
    };
  }

  let rows: TemplateRow[];

  if (format === "json") {
    try {
      const parsed = JSON.parse(content);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return {
        created: 0,
        updated: 0,
        errors: ["Invalid JSON content"],
      };
    }
  } else {
    rows = parseCsv(content);
  }

  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  const existingTemplates = await api.template.findMany({
    first: 250,
    select: { id: true, name: true },
  });
  const existingByName = new Map(
    (existingTemplates || []).map((t: { id: string; name: string }) => [t.name, t])
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const err = validateRow(row, i);
    if (err) {
      errors.push(err);
      continue;
    }

    const data = normalizeRow(row);
    const name = data.name as string;

    try {
      const existing = existingByName.get(name);
      if (existing) {
        await api.template.update(existing.id, {
          scenarioKey: data.scenarioKey,
          isActive: data.isActive,
          priority: data.priority,
          whenToUse: data.whenToUse,
          signalsToCheckJson: data.signalsToCheckJson,
          questionsToAnswerJson: data.questionsToAnswerJson,
          doNotSayJson: data.doNotSayJson,
          toneGuidelines: data.toneGuidelines,
          structureHintsJson: data.structureHintsJson,
          requiredDataJson: data.requiredDataJson,
          defaultCategory: data.defaultCategory,
          defaultPriorityBand: data.defaultPriorityBand,
          slaHours: data.slaHours,
          category: data.category,
          subject: data.subject,
          bodyText: data.bodyText,
          availableVariables: data.availableVariables,
          requiredVariables: data.requiredVariables,
          safetyLevel: data.safetyLevel,
          active: data.active,
          description: data.description,
          autoSendEnabled: data.autoSendEnabled,
        });
        updated++;
      } else {
        const createdRecord = await api.template.create({
          name,
          scenarioKey: data.scenarioKey,
          isActive: data.isActive,
          priority: data.priority,
          whenToUse: data.whenToUse,
          signalsToCheckJson: data.signalsToCheckJson,
          questionsToAnswerJson: data.questionsToAnswerJson,
          doNotSayJson: data.doNotSayJson,
          toneGuidelines: data.toneGuidelines,
          structureHintsJson: data.structureHintsJson,
          requiredDataJson: data.requiredDataJson,
          defaultCategory: data.defaultCategory,
          defaultPriorityBand: data.defaultPriorityBand,
          slaHours: data.slaHours,
          category: data.category,
          subject: data.subject,
          bodyText: data.bodyText,
          availableVariables: data.availableVariables,
          requiredVariables: data.requiredVariables,
          safetyLevel: data.safetyLevel,
          active: data.active,
          description: data.description,
          autoSendEnabled: data.autoSendEnabled,
        } as Record<string, unknown>);
        created++;
        if (createdRecord?.id) {
          existingByName.set(name, { id: createdRecord.id, name });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Row ${i + 1} (${name}): ${msg}`);
      logger.warn({ name, error: msg }, "Import template failed");
    }
  }

  logger.info({ created, updated, errors: errors.length }, "Import templates complete");
  return { created, updated, errors };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
