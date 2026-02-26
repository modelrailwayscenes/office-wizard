import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "productionType" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "5RYT473pkqbB",
  comment:
    "Defines production job templates and their configurations. Controls categorization, prioritization, SLA requirements, and batch grouping rules for different types of production work (e.g., personalised items, standard prints, paint-only jobs). Used to standardize how production jobs are classified and processed through the workflow.",
  fields: {
    batchingKey: {
      type: "string",
      validations: { stringLength: { min: null, max: 200 } },
      storageKey: "4PNg4LWSxvRF",
    },
    category: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "personalised",
        "standard_print",
        "paint_only",
        "pack_only",
      ],
      validations: { required: true },
      storageKey: "Cs7TQ1JaRXtH",
    },
    classificationRules: {
      type: "json",
      storageKey: "T6jRnPkvvbB7",
      filterIndex: false,
    },
    defaultPriorityBand: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["P0", "P1", "P2", "P3"],
      storageKey: "Sh-VYyR0FPUq",
      searchIndex: false,
    },
    defaultSlaDays: {
      type: "number",
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "y1zbQJ1f2VSj",
    },
    isActive: {
      type: "boolean",
      default: true,
      validations: { required: true },
      storageKey: "HxCm-vEoZKBC",
      searchIndex: false,
    },
    name: {
      type: "string",
      validations: {
        required: true,
        stringLength: { min: null, max: 200 },
      },
      storageKey: "_pA1BLtoJ0Yz",
    },
    productionJobs: {
      type: "hasMany",
      children: {
        model: "productionJob",
        belongsToField: "productionType",
      },
      storageKey: "JHd9RBPiUkQn",
    },
    statusWorkflow: { type: "json", storageKey: "iqB0BtRBC0c_" },
  },
};
