import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "productionBatch" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "zp86jq8KdZ6m",
  fields: {
    createdByUser: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "user" },
      storageKey: "hwpzJYTGuytd",
    },
    name: {
      type: "string",
      validations: { required: true },
      storageKey: "HP1i8aR8YUY7",
    },
    printerProfileId: { type: "string", storageKey: "r7CyJlgPyD4V" },
    productionJobs: {
      type: "hasMany",
      children: { model: "productionJob", belongsToField: "batch" },
      storageKey: "lfZJqT4cQ1wF",
    },
    scheduledFor: {
      type: "dateTime",
      includeTime: true,
      storageKey: "P-XU2v6p59Wy",
    },
    status: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["planned", "in_progress", "done"],
      validations: { required: true },
      storageKey: "1fTuSm59XpDZ",
    },
  },
};
