import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeDuplicateCandidate" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeDuplicateCandidateModel",
  fields: {
    amount: { type: "number", storageKey: "financeDuplicateAmount" },
    duplicateKey: {
      type: "string",
      validations: { unique: true },
      storageKey: "financeDuplicateKey",
    },
    existingDocumentRef: {
      type: "string",
      storageKey: "financeDuplicateExistingDocumentRef",
    },
    invoiceNumber: {
      type: "string",
      storageKey: "financeDuplicateInvoiceNumber",
    },
    reasonJson: {
      type: "json",
      storageKey: "financeDuplicateReasonJson",
    },
    sourceDocumentRef: {
      type: "string",
      storageKey: "financeDuplicateSourceDocumentRef",
    },
    status: {
      type: "enum",
      default: "pending_review",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "pending_review",
        "confirmed_duplicate",
        "false_positive",
      ],
      storageKey: "financeDuplicateStatus",
    },
    supplierName: {
      type: "string",
      storageKey: "financeDuplicateSupplierName",
    },
  },
};
