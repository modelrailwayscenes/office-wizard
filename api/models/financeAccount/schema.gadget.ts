import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeAccount" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeAccountModel",
  fields: {
    accountIdentifierMasked: {
      type: "string",
      storageKey: "financeAccountIdentifierMasked",
    },
    balanceCurrent: {
      type: "number",
      storageKey: "financeAccountBalanceCurrent",
    },
    currency: {
      type: "string",
      default: "GBP",
      storageKey: "financeAccountCurrency",
    },
    displayName: {
      type: "string",
      validations: {
        required: true,
        stringLength: { min: 1, max: 200 },
      },
      storageKey: "financeAccountDisplayName",
    },
    lastSyncedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeAccountLastSyncedAt",
    },
    provider: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["open_banking", "paypal", "shopify", "manual"],
      validations: { required: true },
      storageKey: "financeAccountProvider",
    },
    providerAccountId: {
      type: "string",
      storageKey: "financeAccountProviderAccountId",
    },
    source: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["halifax", "monzo", "paypal", "shopify", "other"],
      storageKey: "financeAccountSource",
    },
    status: {
      type: "enum",
      default: "active",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["active", "paused"],
      storageKey: "financeAccountStatus",
    },
    syncCursor: {
      type: "string",
      storageKey: "financeAccountSyncCursor",
    },
  },
};
