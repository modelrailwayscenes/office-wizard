import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "signature" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "uy6iNQYrG_Ud",
  comment:
    "This model represents reusable email signatures that can be applied to templates, allowing users to easily manage and switch between different signatures for various email communications.",
  fields: {
    bcc: { type: "string", storageKey: "p6AFHm0qNXmI" },
    body: {
      type: "string",
      validations: { required: true },
      storageKey: "E8f6sz5lvGT1",
      searchIndex: false,
    },
    importance: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["High", "Normal", "Low"],
      validations: { required: true },
      storageKey: "2XQtBoZZqYlz",
    },
    name: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "kFpc2Qf01j6C",
    },
    signOff: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "Yours faithfully",
        "Yours sincerely",
        "Many thanks",
        "Best regards",
        "Regards",
      ],
      validations: { required: true },
      storageKey: "vUkiyc1_ufky",
    },
  },
};
