import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "actionLog" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "vSPnVSmMQhUi",
  comment:
    "Immutable audit trail tracking all actions performed on emails and conversations. Records who performed each action, when, how it was triggered, and whether it succeeded. Critical for compliance, debugging, and understanding system behavior. Write-only for system; read-only for authenticated users.",
  fields: {
    action: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "email_fetched",
        "classified",
        "draft_created",
        "email_sent",
        "moved_folder",
        "category_applied",
        "category_removed",
        "flagged",
        "unflagged",
        "marked_read",
        "marked_unread",
        "archived",
        "status_changed",
        "assigned",
        "note_added",
        "template_applied",
        "bulk_action",
        "escalated",
        "resolved",
      ],
      validations: { required: true },
      storageKey: "ZWdvF8fRRE4L",
    },
    actionDescription: {
      type: "string",
      validations: { required: true },
      storageKey: "4Hc1Mn_uie37",
    },
    afterState: { type: "json", storageKey: "GdKn9toUtEMd" },
    autoSent: {
      type: "boolean",
      default: false,
      storageKey: "avEWdtttYpYA",
      searchIndex: false,
    },
    automationReason: {
      type: "string",
      storageKey: "HqDGocQpOcOt",
      filterIndex: false,
    },
    beforeState: {
      type: "json",
      storageKey: "40CL9CzKYwRy",
      filterIndex: false,
      searchIndex: false,
    },
    bulkActionCount: {
      type: "number",
      decimals: 0,
      storageKey: "LY842BWI1gAx",
      searchIndex: false,
    },
    bulkActionId: { type: "string", storageKey: "JA8NnwSsMFOR" },
    categoryApplied: { type: "string", storageKey: "hEb21vrCf3c6" },
    confidenceScore: {
      type: "number",
      decimals: 2,
      storageKey: "MBHqYa0oXwv7",
      searchIndex: false,
    },
    conversation: {
      type: "belongsTo",
      parent: { model: "conversation" },
      storageKey: "D0vBHD0Sk-N8",
    },
    draftBody: { type: "string", storageKey: "YLKyaVYHGYvK" },
    emailMessage: {
      type: "belongsTo",
      parent: { model: "emailMessage" },
      storageKey: "CIZlk4WBNBVG",
    },
    errorCode: { type: "string", storageKey: "vV8g1nBsiH49" },
    errorMessage: { type: "string", storageKey: "lJmrS2M1KZjU" },
    folderMovedTo: { type: "string", storageKey: "a5sXOUk9zr51" },
    manualOverride: {
      type: "boolean",
      default: false,
      storageKey: "-G7MyN_3a3lw",
    },
    metadata: {
      type: "json",
      storageKey: "xj3xy6CgeOIH",
      searchIndex: false,
    },
    performedAt: {
      type: "dateTime",
      includeTime: true,
      validations: { required: true },
      storageKey: "RVNWsMaxdGMV",
    },
    performedBy: {
      type: "string",
      validations: { required: true },
      storageKey: "yAvdcZPxtxcJ",
    },
    performedVia: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "web_ui",
        "chatgpt",
        "api",
        "scheduled_job",
        "auto_triage",
      ],
      validations: { required: true },
      storageKey: "059DnSK_BAZc",
    },
    safetyChecks: {
      type: "json",
      default: "null",
      storageKey: "U3wBWTN3wG46",
    },
    safetyChecksPassed: {
      type: "boolean",
      default: true,
      storageKey: "1hnUZwK10an5",
    },
    sentTo: {
      type: "json",
      storageKey: "BqjLmCB1YHS9",
      filterIndex: false,
      searchIndex: false,
    },
    success: {
      type: "boolean",
      default: true,
      storageKey: "ivMYD-gWhdFn",
    },
    template: {
      type: "belongsTo",
      parent: { model: "template" },
      storageKey: "IyMPrqFhhdCo",
    },
    templateUsed: { type: "string", storageKey: "bo9AAMIHYW5K" },
  },
};
