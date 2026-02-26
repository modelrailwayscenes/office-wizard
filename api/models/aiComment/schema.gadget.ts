import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "aiComment" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "2_2U-vqWkcoW",
  fields: {
    batchOperation: {
      type: "belongsTo",
      parent: { model: "batchOperation" },
      storageKey: "1OPA1CKzpzHF",
    },
    content: {
      type: "string",
      validations: { required: true },
      storageKey: "PYe8onrf2pyF",
    },
    conversation: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "conversation" },
      storageKey: "EC_ggmFZrh5Q",
    },
    kind: {
      type: "string",
      validations: { required: true },
      storageKey: "XImUW55WPpEX",
    },
    metaJson: {
      type: "string",
      storageKey: "sc_p3aUzZKc5",
      filterIndex: false,
      searchIndex: false,
    },
    model: { type: "string", storageKey: "mtwNNzWPIfm5" },
    playbook: {
      type: "belongsTo",
      parent: { model: "template" },
      storageKey: "aiComment_playbook_template_link",
    },
    source: {
      type: "string",
      validations: { required: true },
      storageKey: "eUK6Az9lKHoJ",
    },
    user: {
      type: "belongsTo",
      parent: { model: "user" },
      storageKey: "2_2U-vqWkcoW-BelongsTo-User",
    },
  },
};
