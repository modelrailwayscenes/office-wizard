import type { ActionOptions } from "gadget-server";

export const params = {
  limit: { type: "number" },
};

export const run: ActionRun = async ({ api, params }) => {
  const limit = Math.max(1, Math.min(100, Number(params?.limit || 25)));
  const txns = await api.financeTransaction.findMany({
    first: limit,
    filter: { status: { equals: "imported" } } as any,
    sort: { postedAt: "Descending" } as any,
    select: { id: true } as any,
  });

  let committed = 0;
  let skipped = 0;
  const details: any[] = [];

  for (const txn of txns || []) {
    const suggestions = await api.suggestFinanceMatches({ transactionId: txn.id, limit: 1 });
    const top = suggestions?.matches?.[0]?.suggestions?.[0];
    if (!top || Number(top.confidence || 0) < 0.95) {
      skipped++;
      continue;
    }
    await api.commitFinanceMatch({
      transactionId: txn.id,
      ledgerEntryId: top.ledgerEntryId,
      markReconciled: false,
      reason: "auto_match_high_confidence",
    });
    committed++;
    details.push({ transactionId: txn.id, ledgerEntryId: top.ledgerEntryId, confidence: top.confidence });
  }

  return { ok: true, scanned: (txns || []).length, committed, skipped, details };
};

export const options: ActionOptions = {};
