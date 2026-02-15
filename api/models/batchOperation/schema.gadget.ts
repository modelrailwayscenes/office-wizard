import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "batchOperation" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "jrP9TsGxr8VO",
  comment:
    "This model tracks batch operations on multiple emails, such as sending tracking requests or resolving delivery issues, and provides insights into the operation's characteristics and relationships with other models.",
  fields: {
    batchType: {
      type: "string",
      validations: { required: true },
      storageKey: "wH6deJZGqLx1",
    },
    category: {
      type: "string",
      validations: { required: true },
      storageKey: "64Fs6YGnadfu",
    },
    completedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "bZDvdks7hfRG",
    },
    conversations: {
      type: "hasMany",
      children: {
        model: "conversation",
        belongsToField: "batchOperation",
      },
      storageKey: "e6YledhWAs8a",
    },
    emailCount: {
      type: "number",
      decimals: 0,
      validations: {
        required: true,
        numberRange: { min: 0, max: null },
      },
      storageKey: "E70lysNSHGdw",
    },
    templateUsed: { type: "string", storageKey: "V-D-aeHqbkWc" },
    timeSaved: {
      type: "string",
      storageKey: "PNbCOuqoZEHz",
      searchIndex: false,
    },
    user: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "user" },
      storageKey: "2hQTyGAkqWWk",
    },
  },
};
