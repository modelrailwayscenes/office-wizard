import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financePeriod" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financePeriodModel",
  fields: {
    endDate: {
      type: "dateTime",
      includeTime: true,
      validations: { required: true },
      storageKey: "financePeriodEndDate",
    },
    label: {
      type: "string",
      validations: { required: true },
      storageKey: "financePeriodLabel",
    },
    periodKey: {
      type: "string",
      validations: { unique: true },
      storageKey: "financePeriodKey",
    },
    startDate: {
      type: "dateTime",
      includeTime: true,
      validations: { required: true },
      storageKey: "financePeriodStartDate",
    },
    type: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["month", "quarter", "tax_year"],
      validations: { required: true },
      storageKey: "financePeriodType",
    },
  },
};
