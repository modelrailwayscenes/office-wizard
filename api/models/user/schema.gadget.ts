import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "user" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "cXIH7rAbZWD-",
  comment:
    "This model represents an authenticated user in the application, storing their login credentials, profile information, and authorization details.",
  fields: {
    email: {
      type: "email",
      validations: { required: true, unique: true },
      storageKey: "kIyTsQ83Egzw",
    },
    emailVerificationToken: {
      type: "string",
      storageKey: "CWwTBf88r4qM",
      searchIndex: false,
    },
    emailVerificationTokenExpiry: {
      type: "dateTime",
      includeTime: true,
      storageKey: "Hc0tCG_aTqX6",
      searchIndex: false,
    },
    emailVerified: {
      type: "boolean",
      validations: { required: true },
      storageKey: "BiDttqdr4K3X",
    },
    firstName: { type: "string", storageKey: "Wf2sxnGfAFpp" },
    googleImageUrl: {
      type: "url",
      storageKey: "gSbkUnx0JSkq",
      filterIndex: false,
      searchIndex: false,
    },
    googleProfileId: {
      type: "string",
      storageKey: "O5YsHuFd5BcC",
      searchIndex: false,
    },
    highContrastMode: {
      type: "boolean",
      default: false,
      storageKey: "pXdkW_LZBLk7",
      filterIndex: false,
      searchIndex: false,
    },
    keyboardNavEnabled: {
      type: "boolean",
      default: false,
      storageKey: "P2zPud124r8S",
    },
    lastName: { type: "string", storageKey: "aFsN3Ai6ULPK" },
    lastSignedIn: {
      type: "dateTime",
      includeTime: true,
      storageKey: "vBeEMSUmzn40",
      searchIndex: false,
    },
    logicallyDeleted: {
      type: "boolean",
      default: false,
      storageKey: "KjjAMJNzVOmJ",
      searchIndex: false,
    },
    password: {
      type: "password",
      validations: { required: true, strongPassword: true },
      storageKey: "NdnH_xDJkFfZ",
    },
    reduceMotion: {
      type: "boolean",
      default: false,
      storageKey: "WP3jTnWliwRt",
      filterIndex: false,
      searchIndex: false,
    },
    resetPasswordToken: {
      type: "string",
      storageKey: "_eyS8gmiMEyf",
      searchIndex: false,
    },
    resetPasswordTokenExpiry: {
      type: "dateTime",
      includeTime: true,
      storageKey: "TJxavNoSCmUE",
      searchIndex: false,
    },
    roleList: { type: "roleList", storageKey: "yjxc6Y7sGbHC" },
    screenReaderOptimised: {
      type: "boolean",
      default: false,
      storageKey: "SWskqZddHzrH",
      filterIndex: false,
      searchIndex: false,
    },
    session: {
      type: "belongsTo",
      parent: { model: "session" },
      storageKey: "eufoWIpzzdIh",
      searchIndex: false,
    },
    textSize: {
      type: "enum",
      default: "medium",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["small", "medium", "large", "xlarge"],
      validations: { required: true },
      storageKey: "QQfVqDB5s158",
      filterIndex: false,
      searchIndex: false,
    },
  },
};
