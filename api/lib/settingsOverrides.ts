type OverrideRow = {
  moduleKey: string;
  settingKey: string;
  valueJson: string;
  valueType?: "string" | "number" | "boolean" | "json" | "null";
  isActive?: boolean;
};

function deserializeOverrideValue(row: OverrideRow): unknown {
  if (row.valueType === "null") return null;

  if (row.valueType === "string") return row.valueJson;

  if (row.valueType === "number") {
    const num = Number(row.valueJson);
    return Number.isFinite(num) ? num : null;
  }

  if (row.valueType === "boolean") {
    return row.valueJson === "true";
  }

  try {
    return JSON.parse(row.valueJson);
  } catch {
    return row.valueJson;
  }
}

export function buildOverrideLookup(rows: OverrideRow[]) {
  const map = new Map<string, unknown>();
  for (const row of rows) {
    if (row?.isActive === false) continue;
    map.set(`${row.moduleKey}:${row.settingKey}`, deserializeOverrideValue(row));
  }
  return map;
}

export function resolveEffectiveSettingValue<T>({
  moduleKey,
  settingKey,
  globalValue,
  overrideLookup,
}: {
  moduleKey: string;
  settingKey: string;
  globalValue: T;
  overrideLookup: Map<string, unknown>;
}) {
  const key = `${moduleKey}:${settingKey}`;
  return (overrideLookup.has(key) ? (overrideLookup.get(key) as T) : globalValue) ?? globalValue;
}
