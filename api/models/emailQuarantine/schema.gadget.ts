import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "emailQuarantine" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "1TxqqRgdEUBi",
  comment:
    "This model represents emails that are quarantined for manual review before being imported into the main email system.",
  fields: {
    approvedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "XTGThwpSbd1E",
    },
    bodyPreview: { type: "string", storageKey: "CZ0Cr_WgXFXx" },
    classificationReason: {
      type: "string",
      storageKey: "eEw6dOkCGlk1",
    },
    fromAddress: { type: "email", storageKey: "MuzhpDlJ2ne0" },
    fromName: {
      type: "string",
      storageKey: "H1ro_V_BeSTB",
      searchIndex: false,
    },
    providerMessageId: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "c28jMhj73zrx",
    },
    receivedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "UfzN2JPDIbBD",
    },
    rejectedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "YWoUsKgLKwld",
    },
    status: {
      type: "enum",
      default: "pending_review",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["pending_review", "approved", "rejected"],
      validations: { required: true },
      storageKey: "5viSVPKCMghh",
    },
    subject: { type: "string", storageKey: "v4AG5NKj7arH" },
  },
};
