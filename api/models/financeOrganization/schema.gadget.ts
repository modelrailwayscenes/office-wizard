import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeOrganization" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeOrganizationModel",
  fields: {
    baseCurrency: {
      type: "string",
      default: "GBP",
      storageKey: "financeOrganizationBaseCurrency",
    },
    name: {
      type: "string",
      validations: {
        required: true,
        stringLength: { min: 1, max: 200 },
      },
      storageKey: "financeOrganizationName",
    },
    taxYearStartDay: {
      type: "number",
      default: 6,
      decimals: 0,
      storageKey: "financeOrganizationTaxStartDay",
    },
    taxYearStartMonth: {
      type: "number",
      default: 4,
      decimals: 0,
      storageKey: "financeOrganizationTaxStartMonth",
    },
    ukTaxMode: {
      type: "enum",
      default: "sole_trader",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["sole_trader", "partnership", "ltd"],
      storageKey: "financeOrganizationTaxMode",
    },
  },
};
