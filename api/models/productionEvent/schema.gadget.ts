import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "productionEvent" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "OrQSSzpsNDtt",
  comment:
    "Immutable audit log tracking all changes to production jobs. Records event type, timestamp, actor, and before/after values for compliance and change history. Each event is system-generated and cannot be modified.",
  fields: {
    actorUser: {
      type: "belongsTo",
      parent: { model: "user" },
      storageKey: "FeRX-DE2uR6_",
    },
    fromValue: {
      type: "json",
      storageKey: "MNvRlN4pFkJu",
      filterIndex: false,
      searchIndex: false,
    },
    productionJob: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "productionJob" },
      storageKey: "Zzj2TumVUpxb",
    },
    toValue: {
      type: "json",
      storageKey: "TcZ3RBe0e_aC",
      filterIndex: false,
      searchIndex: false,
    },
    type: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "created",
        "status_changed",
        "assigned",
        "edited",
        "batched",
        "unbatched",
        "note_added",
      ],
      validations: { required: true },
      storageKey: "eH8pFrq5EFFj",
    },
  },
};
