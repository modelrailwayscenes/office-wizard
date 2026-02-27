export type FinanceRuleResult = {
  ruleId?: string;
  ruleName: string;
  matched: boolean;
  reasons: string[];
  actions: Record<string, any>;
  confidence?: number;
};

const normalize = (value: unknown) => String(value || "").toLowerCase();

export const evaluateFinanceRule = (rule: any, context: Record<string, any>): FinanceRuleResult => {
  const conditions = (rule?.conditions || {}) as Record<string, any>;
  const actions = (rule?.actions || {}) as Record<string, any>;
  const reasons: string[] = [];

  const sourceText = `${context.subject || ""} ${context.descriptionRaw || ""} ${context.bodyExcerpt || ""}`.toLowerCase();
  if (Array.isArray(conditions.subjectContainsAny) && conditions.subjectContainsAny.length > 0) {
    const matched = conditions.subjectContainsAny.some((term: string) => sourceText.includes(normalize(term)));
    if (!matched) return { ruleId: rule?.id, ruleName: rule?.name || "rule", matched: false, reasons: [], actions: {} };
    reasons.push("subject_contains_any");
  }

  if (Array.isArray(conditions.senderDomainIn) && conditions.senderDomainIn.length > 0) {
    const fromAddress = normalize(context.fromAddress);
    const matched = conditions.senderDomainIn.some((domain: string) => fromAddress.endsWith(`@${normalize(domain)}`));
    if (!matched) return { ruleId: rule?.id, ruleName: rule?.name || "rule", matched: false, reasons: [], actions: {} };
    reasons.push("sender_domain_match");
  }

  if (Array.isArray(conditions.descriptionContainsAny) && conditions.descriptionContainsAny.length > 0) {
    const matched = conditions.descriptionContainsAny.some((term: string) => sourceText.includes(normalize(term)));
    if (!matched) return { ruleId: rule?.id, ruleName: rule?.name || "rule", matched: false, reasons: [], actions: {} };
    reasons.push("description_contains_any");
  }

  if (conditions.amountLessThan !== undefined) {
    const amount = Number(context.amount || 0);
    if (!(amount < Number(conditions.amountLessThan))) {
      return { ruleId: rule?.id, ruleName: rule?.name || "rule", matched: false, reasons: [], actions: {} };
    }
    reasons.push("amount_less_than");
  }
  if (conditions.amountGreaterThan !== undefined) {
    const amount = Number(context.amount || 0);
    if (!(amount > Number(conditions.amountGreaterThan))) {
      return { ruleId: rule?.id, ruleName: rule?.name || "rule", matched: false, reasons: [], actions: {} };
    }
    reasons.push("amount_greater_than");
  }

  return {
    ruleId: rule?.id,
    ruleName: String(rule?.name || "rule"),
    matched: true,
    reasons,
    actions,
    confidence: Number(actions?.confidence || 0.9),
  };
};

export const evaluateFinanceRules = (rules: any[], context: Record<string, any>) => {
  const ordered = [...(rules || [])].sort((a, b) => Number(a?.priority || 999) - Number(b?.priority || 999));
  const matched: FinanceRuleResult[] = [];
  for (const rule of ordered) {
    if (!rule?.enabled) continue;
    const result = evaluateFinanceRule(rule, context);
    if (!result.matched) continue;
    matched.push(result);
    if (Boolean(rule?.stopProcessing)) break;
  }
  return matched;
};
