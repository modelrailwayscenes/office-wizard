import type { ActionOptions } from "gadget-server";

export const params = {
  transactionId: { type: "string" },
  ledgerEntryId: { type: "string" },
  markReconciled: { type: "boolean" },
  reason: { type: "string" },
};

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  return [];
};

export const run: ActionRun = async ({ api, params, session }) => {
  const transactionId = String(params?.transactionId || "");
  const ledgerEntryId = String(params?.ledgerEntryId || "");
  const markReconciled = Boolean(params?.markReconciled);
  const reason = String(params?.reason || "manual_match");
  if (!transactionId || !ledgerEntryId) throw new Error("transactionId and ledgerEntryId are required");

  const txn = await api.financeTransaction.findOne(transactionId, {
    select: { id: true, status: true, amount: true, postedAt: true, descriptionRaw: true } as any,
  });
  const ledger = await api.financeLedgerEntry.findOne(ledgerEntryId, {
    select: { id: true, linkedTransactionIdsJson: true, status: true, description: true } as any,
  });
  if (!txn || !ledger) throw new Error("Transaction or ledger entry not found");

  const linked = parseJsonArray(ledger.linkedTransactionIdsJson);
  if (!linked.includes(txn.id)) linked.push(txn.id);

  await api.financeLedgerEntry.update(ledger.id, {
    linkedTransactionIdsJson: linked,
    status: ledger.status === "draft" ? "needs_approval" : ledger.status,
  } as any);

  await api.financeTransaction.update(txn.id, {
    status: markReconciled ? "reconciled" : "matched",
  } as any);

  const userRef = session?.get("user");
  const actorEmail = typeof userRef === "string" ? userRef : String(userRef?.id || userRef?._link || "system");
  await api.financeAuditLog.create({
    entityType: "finance_match",
    entityId: `${txn.id}:${ledger.id}`,
    action: markReconciled ? "reconcile" : "match",
    actorEmail,
    reason,
    beforeState: {
      transactionStatus: txn.status,
      linkedTransactionIds: parseJsonArray(ledger.linkedTransactionIdsJson),
    },
    afterState: {
      transactionStatus: markReconciled ? "reconciled" : "matched",
      linkedTransactionIds: linked,
    },
    metadata: { transactionId: txn.id, ledgerEntryId: ledger.id },
    occurredAt: new Date().toISOString(),
  } as any);

  return { ok: true, transactionId: txn.id, ledgerEntryId: ledger.id, status: markReconciled ? "reconciled" : "matched" };
};

export const options: ActionOptions = {};
