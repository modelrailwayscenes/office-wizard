import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "session" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "-juu_txRrjFJ",
  fields: {
    expiresAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "CA7gbMLE1N6B",
    },
    oauthState: {
      type: "string",
      storageKey: "QMvPH5RjE8i7",
      filterIndex: false,
    },
    roles: {
      type: "roleList",
      default: ["unauthenticated"],
      storageKey: "oS5xb05JloGX",
    },
    user: {
      type: "belongsTo",
      parent: { model: "user" },
      storageKey: "--vrp0dHvMO-",
    },
  },
};
