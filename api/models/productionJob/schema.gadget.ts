import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "productionJob" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "BF-6eETSGHFm",
  fields: {
    assignedTo: {
      type: "belongsTo",
      parent: { model: "user" },
      storageKey: "xS7n5Iwf_qcX",
    },
    batch: {
      type: "belongsTo",
      parent: { model: "productionBatch" },
      storageKey: "g8PtmLXnaGgx",
    },
    colour: { type: "string", storageKey: "f1ikGeAaMn-T" },
    daysToDeliver: { type: "number", storageKey: "lG5u3Jwm7-n9" },
    dueBy: {
      type: "dateTime",
      includeTime: true,
      storageKey: "wHneCb0W77vd",
    },
    events: {
      type: "hasMany",
      children: {
        model: "productionEvent",
        belongsToField: "productionJob",
      },
      storageKey: "V6xcIV1Udeg7",
    },
    externalRef: {
      type: "string",
      validations: { unique: true },
      storageKey: "7mnmKVmp7of5",
    },
    marketplace: { type: "string", storageKey: "jn5Uzzk45KcC" },
    notes: { type: "string", storageKey: "nDuEIggqr9yV" },
    orderDate: {
      type: "dateTime",
      includeTime: true,
      storageKey: "O1gQv7KRHRYd",
    },
    orderNumber: { type: "string", storageKey: "1sqW0mkCwC2w" },
    priorityBand: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["P0", "P1", "P2", "P3"],
      storageKey: "incdNkoFwsyj",
    },
    priorityScore: { type: "number", storageKey: "k3WAtIXnkd9u" },
    productName: {
      type: "string",
      validations: { required: true },
      storageKey: "RmfDzAOIthYk",
    },
    productionType: {
      type: "belongsTo",
      parent: { model: "productionType" },
      storageKey: "NYH5dJPREqNd",
    },
    quantityRequired: {
      type: "number",
      validations: {
        required: true,
        numberRange: { min: 1, max: null },
      },
      storageKey: "4HvC_nuD5MSK",
    },
    scale: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["N", "OO", "O", "HO", "TT"],
      storageKey: "KJus4QOu2H7D",
    },
    sides: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["single", "double"],
      storageKey: "Hi7taWb7yKbs",
    },
    sku: { type: "string", storageKey: "QnA_ZUTLK3-x" },
    source: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["shopify_order", "inventory_replenishment", "manual"],
      validations: { required: true },
      storageKey: "lFeTFraIAORt",
    },
    stationOrText: { type: "string", storageKey: "tD61dyBCZZjW" },
    status: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "queued",
        "printing",
        "post_processing",
        "painting",
        "ready_to_dispatch",
        "dispatched",
        "on_hold",
        "cancelled",
        "fulfilled",
      ],
      validations: { required: true },
      storageKey: "iPrEFeNgp4CA",
    },
    style: { type: "string", storageKey: "3qjzuhdD2PEr" },
    textLines: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["1", "2"],
      storageKey: "qXrlARah7KAw",
    },
  },
};
