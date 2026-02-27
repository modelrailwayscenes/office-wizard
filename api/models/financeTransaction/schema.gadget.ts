import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeTransaction" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeTransactionModel",
  fields: {
    account: {
      type: "belongsTo",
      parent: { model: "financeAccount" },
      storageKey: "financeTransactionAccount",
    },
    amount: {
      type: "number",
      validations: { required: true },
      storageKey: "financeTransactionAmount",
    },
    counterpartyRaw: {
      type: "string",
      storageKey: "financeTransactionCounterpartyRaw",
    },
    currency: {
      type: "string",
      default: "GBP",
      storageKey: "financeTransactionCurrency",
    },
    descriptionRaw: {
      type: "string",
      storageKey: "financeTransactionDescriptionRaw",
    },
    postedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeTransactionPostedAt",
    },
    rawPayload: {
      type: "json",
      storageKey: "financeTransactionRawPayload",
      filterIndex: false,
    },
    source: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["halifax", "monzo", "paypal", "shopify", "other"],
      validations: { required: true },
      storageKey: "financeTransactionSource",
    },
    sourceTxnId: {
      type: "string",
      validations: { required: true },
      storageKey: "financeTransactionSourceTxnId",
    },
    sourceUniqueRef: {
      type: "string",
      validations: { unique: true },
      storageKey: "financeTransactionSourceUniqueRef",
    },
    status: {
      type: "enum",
      default: "imported",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["imported", "matched", "reconciled", "ignored"],
      storageKey: "financeTransactionStatus",
    },
  },
};
