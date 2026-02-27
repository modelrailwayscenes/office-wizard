import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeCounterparty" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeCounterpartyModel",
  fields: {
    aliases: {
      type: "json",
      default: "[]",
      storageKey: "financeCounterpartyAliases",
    },
    defaultCategory: {
      type: "belongsTo",
      parent: { model: "financeCategory" },
      storageKey: "financeCounterpartyDefaultCategory",
    },
    name: {
      type: "string",
      validations: {
        required: true,
        stringLength: { min: 1, max: 200 },
      },
      storageKey: "financeCounterpartyName",
    },
    trustedSupplier: {
      type: "boolean",
      default: false,
      storageKey: "financeCounterpartyTrustedSupplier",
    },
    vatNumber: {
      type: "string",
      storageKey: "financeCounterpartyVatNumber",
    },
  },
};
