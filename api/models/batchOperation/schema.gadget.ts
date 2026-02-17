import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "batchOperation" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "jrP9TsGxr8VO",
  comment:
    "This model tracks batch operations on multiple emails, such as sending tracking requests or resolving delivery issues, and provides insights into the operation's characteristics and relationships with other models.",
  fields: {
    action: {
      type: "string",
      validations: { required: true },
      storageKey: "4eyDxoClDKmq",
      searchIndex: false,
    },
    batchId: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "io5l7JWjk7Ck",
    },
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
    createdBy: {
      type: "string",
      storageKey: "WsUQgOK_u_lr",
      searchIndex: false,
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
    errorCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "yHECaf66jprO",
      searchIndex: false,
    },
    label: {
      type: "string",
      validations: { required: true },
      storageKey: "gDZbxQqkvrL6",
    },
    notes: {
      type: "string",
      storageKey: "1Zjj-eVwLHC_",
      filterIndex: false,
    },
    savedCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "yZzIG_2OrUSo",
      searchIndex: false,
    },
    sentCount: {
      type: "number",
      default: 0,
      decimals: 0,
      validations: { numberRange: { min: 0, max: null } },
      storageKey: "MjAl8OlM_aQ1",
      searchIndex: false,
    },
    status: {
      type: "string",
      default: "in_progress",
      validations: { required: true },
      storageKey: "VyMkPac-xq-O",
      searchIndex: false,
    },
    templateUsed: { type: "string", storageKey: "V-D-aeHqbkWc" },
    timeSaved: {
      type: "string",
      storageKey: "PNbCOuqoZEHz",
      searchIndex: false,
    },
    type: {
      type: "string",
      validations: { required: true },
      storageKey: "bcieMVOHltdA",
      searchIndex: false,
    },
    user: {
      type: "belongsTo",
      parent: { model: "user" },
      storageKey: "2hQTyGAkqWWk",
    },
  },
};
