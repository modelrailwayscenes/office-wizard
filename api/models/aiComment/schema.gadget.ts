import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "aiComment" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "2_2U-vqWkcoW",
  fields: {
    user: {
      type: "belongsTo",
      parent: { model: "user" },
      storageKey: "2_2U-vqWkcoW-BelongsTo-User",
    },
  },
};
