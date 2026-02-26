export interface DraftEligibilityInput {
  selectedPlaybookId?: string | null;
  selectedPlaybookConfidence?: number | null;
  isVerifiedCustomer?: boolean | null;
  shopifyOrderNumbers?: unknown;
  primaryCustomerEmail?: string | null;
  primaryCustomerName?: string | null;
  orderValue?: string | null;
  selectedPlaybookRequiredDataJson?: string | null;
  playbookSelectionMetaJson?: string | null;
  shopifyOrderContext?: unknown;
}

export interface DraftEligibilityResult {
  eligible: boolean;
  reasons: string[];
  hints: string[];
  missingRequiredData: string[];
}

function parseStringArrayJson(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function parseMeta(raw?: string | null): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function normalizeRequiredKey(raw: string): string {
  return raw.replace(/[\s_-]/g, "").toLowerCase();
}

export function evaluateDraftEligibility(input: DraftEligibilityInput): DraftEligibilityResult {
  const reasons: string[] = [];
  const hints: string[] = [];
  const confidence =
    typeof input.selectedPlaybookConfidence === "number" ? input.selectedPlaybookConfidence : null;
  const hasOrderNumbers =
    Array.isArray(input.shopifyOrderNumbers) && input.shopifyOrderNumbers.length > 0;
  const hasCustomerIdentifier = Boolean(input.primaryCustomerEmail) || hasOrderNumbers;
  const requiredDataKeys = parseStringArrayJson(input.selectedPlaybookRequiredDataJson);
  const meta = parseMeta(input.playbookSelectionMetaJson);
  const variables = (meta?.variables || {}) as Record<string, unknown>;
  const orderContext = (input.shopifyOrderContext || {}) as Record<string, unknown>;
  const missingRequiredData: string[] = [];

  if (!input.selectedPlaybookId) {
    reasons.push("No playbook selected");
  }
  if (confidence === null || confidence < 0.55) {
    reasons.push("Low playbook confidence (< 0.55)");
  }
  if (!input.isVerifiedCustomer && !hasOrderNumbers) {
    reasons.push("Needs verified customer or order context");
  }
  if (!hasCustomerIdentifier) {
    reasons.push("Missing customer identifier");
  }

  for (const req of requiredDataKeys) {
    const key = normalizeRequiredKey(req);
    let present = false;
    if (key === "customername") {
      present = hasMeaningfulValue(input.primaryCustomerName) || hasMeaningfulValue(variables.customerName);
    } else if (key === "customeremail") {
      present = hasMeaningfulValue(input.primaryCustomerEmail) || hasMeaningfulValue(variables.customerEmail);
    } else if (key === "orderid" || key === "ordernumber") {
      present =
        hasOrderNumbers ||
        hasMeaningfulValue(input.orderValue) ||
        hasMeaningfulValue(variables.orderId) ||
        hasMeaningfulValue(variables.orderNumber);
    } else if (key === "shippingstatus") {
      present =
        hasMeaningfulValue(variables.shippingStatus) ||
        hasMeaningfulValue(orderContext.shippingStatus) ||
        hasMeaningfulValue(orderContext.fulfillmentStatus);
    } else {
      present = hasMeaningfulValue((variables as any)[req]) || hasMeaningfulValue((variables as any)[key]);
    }

    if (!present) missingRequiredData.push(req);
  }

  if (missingRequiredData.length > 0) {
    reasons.push(`Missing required data: ${missingRequiredData.join(", ")}`);
    hints.push(`Collect ${missingRequiredData.join(", ")} before generating or sending draft`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    hints,
    missingRequiredData,
  };
}
