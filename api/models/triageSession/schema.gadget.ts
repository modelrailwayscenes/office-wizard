import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "triageSession" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "GDCl82yTGGQl",
  comment:
    "This model tracks workflow triage sessions, including start and end times, items processed, emails sent, and other key metrics.",
  fields: {
    duration: {
      type: "number",
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "fx4-8WkPrINl",
      searchIndex: false,
    },
    endTime: {
      type: "dateTime",
      includeTime: true,
      storageKey: "rkinIOyuLToK",
    },
    escalatedCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "6OCLdgoB2QRv",
    },
    itemsCompleted: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "eceYzt9VDLG2",
    },
    savedCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "H8-vijJ9X-wk",
      searchIndex: false,
    },
    sentCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "ucNFKIQz6wWt",
    },
    startTime: {
      type: "dateTime",
      includeTime: true,
      validations: { required: true },
      storageKey: "qYz6YQ593NuO",
    },
    user: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "user" },
      storageKey: "GXrGHYfqT78y",
      searchIndex: false,
    },
  },
};
