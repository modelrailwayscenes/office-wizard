import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeEmailMessage" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeEmailMessageModel",
  fields: {
    attachmentIdsJson: {
      type: "json",
      default: "[]",
      storageKey: "financeEmailMessageAttachmentIds",
    },
    bodyExcerpt: {
      type: "string",
      storageKey: "financeEmailMessageBodyExcerpt",
    },
    folderPath: {
      type: "string",
      storageKey: "financeEmailMessageFolderPath",
    },
    fromAddress: {
      type: "email",
      storageKey: "financeEmailMessageFrom",
    },
    headersSnapshot: {
      type: "json",
      storageKey: "financeEmailMessageHeadersSnapshot",
      filterIndex: false,
    },
    m365MessageId: {
      type: "string",
      validations: { required: true },
      storageKey: "financeEmailMessageM365Id",
    },
    messageKey: {
      type: "string",
      validations: { unique: true },
      storageKey: "financeEmailMessageKey",
    },
    receivedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeEmailMessageReceivedAt",
    },
    subject: {
      type: "string",
      storageKey: "financeEmailMessageSubject",
    },
    toAddress: {
      type: "string",
      storageKey: "financeEmailMessageTo",
    },
  },
};
