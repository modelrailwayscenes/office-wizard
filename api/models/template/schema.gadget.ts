import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "template" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "_UkjDddn9pAU",
  fields: {
    actionLogs: {
      type: "hasMany",
      children: { model: "actionLog", belongsToField: "template" },
      storageKey: "HwpUc4aH3QSV",
    },
    active: { type: "boolean", storageKey: "COyIVgy1Y6VB" },
    autoSendConfidenceThreshold: {
      type: "number",
      validations: { numberRange: { min: 0, max: 1 } },
      storageKey: "wicAsKPl1vpQ",
    },
    autoSendEnabled: { type: "boolean", storageKey: "ihbOTFHA8tVO" },
    availableVariables: {
      type: "json",
      validations: { required: true },
      storageKey: "faQBY3fMtfKK",
    },
    bodyHtml: { type: "richText", storageKey: "qH7_QU_7C2-a" },
    bodyText: {
      type: "string",
      validations: { required: true },
      storageKey: "D4ZJI2YGEtMD",
    },
    category: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "tracking_request",
        "product_instructions",
        "opening_hours",
        "general_faq",
        "request_more_info",
        "refund_policy",
        "delivery_info",
        "custom",
      ],
      validations: { required: true },
      storageKey: "EIWP3eGwMHs8",
    },
    createdBy: { type: "string", storageKey: "vQPboiNnxTBW" },
    defaultCategory: {
      type: "string",
      storageKey: "template_playbook_defaultCategory",
    },
    defaultPriorityBand: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["urgent", "high", "medium", "low", "unclassified"],
      storageKey: "template_playbook_defaultPriorityBand",
    },
    description: { type: "string", storageKey: "l1F4ERtBF_WM" },
    doNotSayJson: {
      type: "string",
      storageKey: "template_playbook_doNotSayJson",
      filterIndex: false,
      searchIndex: false,
    },
    excludeIfPresent: { type: "json", storageKey: "wVsv4u09wneX" },
    isActive: {
      type: "boolean",
      default: true,
      storageKey: "template_playbook_isActive",
    },
    lastUsedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "osGXo6HHoG1E",
    },
    name: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "YApR4r1hGXOe",
    },
    previousVersionId: { type: "string", storageKey: "uAVpfwW5gZJa" },
    priority: {
      type: "number",
      default: 100,
      decimals: 0,
      storageKey: "template_playbook_priority",
    },
    questionsToAnswerJson: {
      type: "string",
      storageKey: "template_playbook_questionsToAnswerJson",
      filterIndex: false,
      searchIndex: false,
    },
    requiredDataJson: {
      type: "string",
      storageKey: "template_playbook_requiredDataJson",
      filterIndex: false,
      searchIndex: false,
    },
    requiredVariables: { type: "json", storageKey: "_YW1zWSjvxIO" },
    requiresOrderId: { type: "boolean", storageKey: "5ciGBgwnd16J" },
    safetyLevel: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["safe", "moderate", "risky"],
      validations: { required: true },
      storageKey: "yQs2AuQ5PQP_",
    },
    scenarioKey: {
      type: "string",
      validations: { unique: true },
      storageKey: "template_playbook_scenarioKey",
    },
    signalsToCheckJson: {
      type: "string",
      storageKey: "template_playbook_signalsToCheckJson",
      filterIndex: false,
      searchIndex: false,
    },
    signature: {
      type: "belongsTo",
      parent: { model: "signature" },
      storageKey: "JguccbD8jodE",
    },
    slaHours: {
      type: "number",
      decimals: 0,
      storageKey: "template_playbook_slaHours",
    },
    structureHintsJson: {
      type: "string",
      storageKey: "template_playbook_structureHintsJson",
      filterIndex: false,
      searchIndex: false,
    },
    subject: { type: "string", storageKey: "CmVg5OCsF0Ji" },
    toneGuidelines: {
      type: "string",
      storageKey: "template_playbook_toneGuidelines",
    },
    triggerIntentCategories: {
      type: "json",
      storageKey: "iQ3KQT_E8k8R",
    },
    triggerKeywords: { type: "json", storageKey: "q_KUvYf82qiq" },
    useCount: { type: "number", storageKey: "vxdnezE_wlMZ" },
    version: { type: "number", storageKey: "2od_QDoBMefK" },
    whenToUse: {
      type: "string",
      storageKey: "template_playbook_whenToUse",
    },
  },
};
