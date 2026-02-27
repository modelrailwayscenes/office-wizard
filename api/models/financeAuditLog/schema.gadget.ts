import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "financeAuditLog" model, go to https://office-wizard.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "financeAuditLogModel",
  fields: {
    action: { type: "string", storageKey: "financeAuditAction" },
    actorEmail: {
      type: "email",
      storageKey: "financeAuditActorEmail",
    },
    afterState: {
      type: "json",
      storageKey: "financeAuditAfterState",
      filterIndex: false,
    },
    beforeState: {
      type: "json",
      storageKey: "financeAuditBeforeState",
      filterIndex: false,
    },
    entityId: { type: "string", storageKey: "financeAuditEntityId" },
    entityType: {
      type: "string",
      storageKey: "financeAuditEntityType",
    },
    metadata: {
      type: "json",
      storageKey: "financeAuditMetadata",
      filterIndex: false,
    },
    occurredAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "financeAuditOccurredAt",
    },
    reason: { type: "string", storageKey: "financeAuditReason" },
  },
};
