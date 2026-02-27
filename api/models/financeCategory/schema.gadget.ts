import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeCategory" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeCategoryModel",
  fields: {
    active: {
      type: "boolean",
      default: true,
      storageKey: "financeCategoryActive",
    },
    direction: {
      type: "enum",
      default: "both",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["income", "expense", "both"],
      storageKey: "financeCategoryDirection",
    },
    hmrcBucketId: {
      type: "string",
      storageKey: "financeCategoryHmrcBucketId",
    },
    name: {
      type: "string",
      validations: { required: true },
      storageKey: "financeCategoryName",
    },
    tags: {
      type: "json",
      default: "[]",
      storageKey: "financeCategoryTags",
    },
    vatTreatment: {
      type: "enum",
      default: "unknown",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "unknown",
        "no_vat",
        "standard",
        "reduced",
        "exempt",
        "outside_scope",
      ],
      storageKey: "financeCategoryVatTreatment",
    },
  },
};
