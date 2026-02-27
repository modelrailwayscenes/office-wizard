import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeDocument" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeDocumentModel",
  fields: {
    amount: { type: "number", storageKey: "financeDocumentAmount" },
    capturedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeDocumentCapturedAt",
    },
    documentKey: {
      type: "string",
      validations: { unique: true },
      storageKey: "financeDocumentKey",
    },
    fileHashSha256: {
      type: "string",
      storageKey: "financeDocumentHash",
    },
    filename: {
      type: "string",
      storageKey: "financeDocumentFilename",
    },
    invoiceNumber: {
      type: "string",
      storageKey: "financeDocumentInvoiceNumber",
    },
    mime: { type: "string", storageKey: "financeDocumentMime" },
    source: {
      type: "enum",
      default: "m365_email",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["m365_email", "upload", "generated"],
      storageKey: "financeDocumentSource",
    },
    sourceRef: {
      type: "string",
      storageKey: "financeDocumentSourceRef",
    },
    storageUri: {
      type: "string",
      storageKey: "financeDocumentStorageUri",
    },
    supplierName: {
      type: "string",
      storageKey: "financeDocumentSupplierName",
    },
    type: {
      type: "enum",
      default: "other",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["invoice", "receipt", "statement", "email", "other"],
      storageKey: "financeDocumentType",
    },
  },
};
