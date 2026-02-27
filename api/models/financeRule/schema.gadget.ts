import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeRule" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeRuleModel",
  fields: {
    actions: {
      type: "json",
      default: "{}",
      storageKey: "financeRuleActions",
    },
    conditions: {
      type: "json",
      default: "{}",
      storageKey: "financeRuleConditions",
    },
    enabled: {
      type: "boolean",
      default: true,
      storageKey: "financeRuleEnabled",
    },
    lastTriggeredAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeRuleLastTriggeredAt",
    },
    name: {
      type: "string",
      validations: { required: true },
      storageKey: "financeRuleName",
    },
    priority: {
      type: "number",
      default: 100,
      decimals: 0,
      storageKey: "financeRulePriority",
    },
    scope: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "email",
        "transaction",
        "matching",
        "categorisation",
        "approval",
      ],
      validations: { required: true },
      storageKey: "financeRuleScope",
    },
    stopProcessing: {
      type: "boolean",
      default: false,
      storageKey: "financeRuleStopProcessing",
    },
    triggerCount: {
      type: "number",
      default: 0,
      decimals: 0,
      storageKey: "financeRuleTriggerCount",
    },
  },
};
