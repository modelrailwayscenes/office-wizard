import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "batchOpportunity" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "pVgSwTVInOTR",
  fields: {
    aiSuggestion: {
      type: "string",
      validations: { required: true },
      storageKey: "vTlUEZkmMNcn",
      filterIndex: false,
    },
    conversations: {
      type: "hasMany",
      children: {
        model: "conversation",
        belongsToField: "batchOpportunity",
      },
      storageKey: "ZLE0RclQ-FXa",
    },
    emailCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: {
        required: true,
        numberRange: { min: 0, max: null },
      },
      storageKey: "QAxZf-0ccNcI",
      searchIndex: false,
    },
    estimatedTimeSaved: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: {
        required: true,
        numberRange: { min: 0, max: null },
      },
      storageKey: "sZj5O2FHTOWg",
      searchIndex: false,
    },
    expiresAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "sr0rn3gGo7te",
      searchIndex: false,
    },
    label: {
      type: "string",
      validations: { required: true },
      storageKey: "i6pGZ6ft9lIC",
    },
    opportunityId: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "GMv-2RHjfES1",
    },
    status: {
      type: "enum",
      default: "pending",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["pending", "actioned", "expired"],
      validations: { required: true },
      storageKey: "rZbem3CqIygs",
    },
    type: {
      type: "string",
      validations: { required: true },
      storageKey: "ZPsB5143TI5U",
    },
  },
};
