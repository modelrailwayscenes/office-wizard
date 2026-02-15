import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "emailMessage" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "srvP_5xudOA4",
  comment:
    "Stores email metadata from Outlook/Microsoft 365 for message triage and processing. Each record represents a single email message with sender info, content preview, status flags, and processing state. Used by the system to ingest messages from email integration and track their processing through classification and action workflows.",
  fields: {
    actionLogs: {
      type: "hasMany",
      children: {
        model: "actionLog",
        belongsToField: "emailMessage",
      },
      storageKey: "aaE2wDC9YMA5",
    },
    attachmentsMetadata: {
      type: "json",
      default: "[]",
      storageKey: "Pi-RJX5cRMa-",
      filterIndex: false,
      searchIndex: false,
    },
    bodyContentType: { type: "string", storageKey: "6DP7Uu8BSqQ6" },
    bodyHash: {
      type: "string",
      storageKey: "wGexQvQiEeP6",
      searchIndex: false,
    },
    bodyHtml: {
      type: "string",
      storageKey: "GzepVUMJf_iV",
      filterIndex: false,
      searchIndex: false,
    },
    bodyPreview: {
      type: "string",
      validations: { stringLength: { min: null, max: 500 } },
      storageKey: "6I_g9AyUBvEf",
    },
    bodyStored: {
      type: "boolean",
      default: false,
      storageKey: "XNuyb0uYS0DV",
      searchIndex: false,
    },
    bodyText: {
      type: "string",
      storageKey: "DhasX84lYSck",
      filterIndex: false,
    },
    categories: { type: "json", storageKey: "b4zRjqw8MmJy" },
    ccAddresses: {
      type: "json",
      default: "null",
      storageKey: "pclHwUrNiZtK",
    },
    classification: {
      type: "hasOne",
      child: {
        model: "classification",
        belongsToField: "emailMessage",
      },
      storageKey: "gXnABxbIpHr0",
    },
    conversation: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "conversation" },
      storageKey: "7dxCaKFCJrEv",
      searchIndex: false,
    },
    entities: {
      type: "json",
      storageKey: "NJMCjibf-MRW",
      filterIndex: false,
      searchIndex: false,
    },
    externalMessageId: {
      type: "string",
      validations: { unique: true },
      storageKey: "JCfz5tWcuco3",
    },
    folderPath: { type: "string", storageKey: "EC-EFWZy9nUt" },
    fromAddress: {
      type: "email",
      validations: { required: true },
      storageKey: "X6mXQKaZHPRk",
    },
    fromEmail: { type: "email", storageKey: "_gnqWqolhD8t" },
    fromName: { type: "string", storageKey: "8pYfx6QtoPP3" },
    graphConversationId: {
      type: "string",
      validations: { required: true },
      storageKey: "pYWvpnVeCNc1",
    },
    hasAttachments: {
      type: "boolean",
      default: false,
      storageKey: "7cWzh40_ThJa",
    },
    hasDraft: {
      type: "boolean",
      default: false,
      storageKey: "bQ-G2CmiVUbb",
    },
    importance: {
      type: "enum",
      default: "normal",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["low", "normal", "high"],
      storageKey: "x6ziz_q0RHwS",
    },
    inReplyTo: {
      type: "string",
      storageKey: "G5o1YCGg6PPW",
      searchIndex: false,
    },
    internetMessageId: { type: "string", storageKey: "vfDV4-HfssXh" },
    isFlagged: {
      type: "boolean",
      default: false,
      storageKey: "CzUO3yqWTbjm",
    },
    isRead: {
      type: "boolean",
      default: false,
      storageKey: "FT2NcJbEO-Zz",
    },
    messageId: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "z4TrIhzCpBDs",
    },
    needsReview: {
      type: "boolean",
      default: false,
      storageKey: "YM8MMQO6zWKT",
      searchIndex: false,
    },
    processed: {
      type: "boolean",
      default: false,
      storageKey: "Z5Qp1CRWgN2F",
      searchIndex: false,
    },
    processedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "T_J3X2LvY_X_",
      searchIndex: false,
    },
    receivedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "8SoBT_a3tGss",
      searchIndex: false,
    },
    receivedDateTime: {
      type: "dateTime",
      includeTime: true,
      validations: { required: true },
      storageKey: "Zs1INOsH_1Kw",
    },
    resolved: {
      type: "boolean",
      default: false,
      storageKey: "UtimC5EZ9JiH",
    },
    sentAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "cgPgm1dcoDXC",
      searchIndex: false,
    },
    sentDateTime: {
      type: "dateTime",
      includeTime: true,
      storageKey: "iG2GH4RjxNKM",
    },
    shopifyCustomerFound: {
      type: "boolean",
      default: false,
      validations: { required: true },
      storageKey: "vvs8PiflHOX0",
      searchIndex: false,
    },
    shopifyLookupCompleted: {
      type: "boolean",
      default: false,
      validations: { required: true },
      storageKey: "pQw8cc_MID6R",
      searchIndex: false,
    },
    subject: {
      type: "string",
      validations: { required: true },
      storageKey: "F1PHmnIgZD55",
    },
    suggestedResponse: {
      type: "richText",
      storageKey: "Or9jVrXrpSB4",
      filterIndex: false,
      searchIndex: false,
    },
    toAddresses: { type: "json", storageKey: "OvmHLiOqTU_K" },
  },
};
