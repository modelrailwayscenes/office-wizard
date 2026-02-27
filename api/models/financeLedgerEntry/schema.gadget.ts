import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeLedgerEntry" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeLedgerEntryModel",
  fields: {
    account: {
      type: "belongsTo",
      parent: { model: "financeAccount" },
      storageKey: "financeLedgerEntryAccount",
    },
    category: {
      type: "belongsTo",
      parent: { model: "financeCategory" },
      storageKey: "financeLedgerEntryCategory",
    },
    counterparty: {
      type: "belongsTo",
      parent: { model: "financeCounterparty" },
      storageKey: "financeLedgerEntryCounterparty",
    },
    createdFrom: {
      type: "enum",
      default: "manual",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["email_ingest", "transaction_import", "manual"],
      storageKey: "financeLedgerEntryCreatedFrom",
    },
    currency: {
      type: "string",
      default: "GBP",
      storageKey: "financeLedgerEntryCurrency",
    },
    description: {
      type: "string",
      storageKey: "financeLedgerEntryDescription",
    },
    direction: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["income", "expense"],
      validations: { required: true },
      storageKey: "financeLedgerEntryDirection",
    },
    entryDate: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeLedgerEntryDate",
    },
    grossAmount: {
      type: "number",
      validations: { required: true },
      storageKey: "financeLedgerEntryGrossAmount",
    },
    linkedDocumentIdsJson: {
      type: "json",
      default: "[]",
      storageKey: "financeLedgerEntryLinkedDocumentIds",
    },
    linkedTransactionIdsJson: {
      type: "json",
      default: "[]",
      storageKey: "financeLedgerEntryLinkedTransactionIds",
    },
    netAmount: {
      type: "number",
      storageKey: "financeLedgerEntryNetAmount",
    },
    paymentStatus: {
      type: "enum",
      default: "unpaid",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["unpaid", "paid", "partially_paid"],
      storageKey: "financeLedgerEntryPaymentStatus",
    },
    status: {
      type: "enum",
      default: "draft",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["draft", "needs_approval", "approved", "locked"],
      storageKey: "financeLedgerEntryStatus",
    },
    tags: {
      type: "json",
      default: "[]",
      storageKey: "financeLedgerEntryTags",
    },
    vatAmount: {
      type: "number",
      storageKey: "financeLedgerEntryVatAmount",
    },
  },
};
