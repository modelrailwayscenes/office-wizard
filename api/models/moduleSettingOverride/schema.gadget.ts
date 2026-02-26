import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "moduleSettingOverride" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "moduleSettingOverride_model",
  comment:
    "Stores module-specific overrides for appConfiguration defaults. Effective values resolve with override ?? global.",
  fields: {
    createdByUserId: {
      type: "string",
      storageKey: "moduleSettingOverride_createdByUserId",
      searchIndex: false,
    },
    isActive: {
      type: "boolean",
      default: true,
      storageKey: "moduleSettingOverride_isActive",
    },
    moduleKey: {
      type: "string",
      validations: { required: true },
      storageKey: "moduleSettingOverride_moduleKey",
    },
    note: {
      type: "string",
      storageKey: "moduleSettingOverride_note",
      filterIndex: false,
      searchIndex: false,
    },
    settingKey: {
      type: "string",
      validations: { required: true },
      storageKey: "moduleSettingOverride_settingKey",
    },
    valueJson: {
      type: "string",
      validations: { required: true },
      storageKey: "moduleSettingOverride_valueJson",
      filterIndex: false,
      searchIndex: false,
    },
    valueType: {
      type: "enum",
      default: "json",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["string", "number", "boolean", "json", "null"],
      storageKey: "moduleSettingOverride_valueType",
    },
  },
};
