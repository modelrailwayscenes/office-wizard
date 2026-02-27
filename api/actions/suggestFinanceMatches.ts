import type { ActionOptions } from "gadget-server";

export const params = {
  transactionId: { type: "string" },
  limit: { type: "number" },
};

const amountConfidence = (txnAmount: number, ledgerAmount: number) => {
  const diff = Math.abs(Math.abs(txnAmount) - Math.abs(ledgerAmount));
  if (diff <= 0.01) return 0.98;
  if (diff <= 0.1) return 0.9;
  if (diff <= 1) return 0.75;
  return 0.4;
};

const dateConfidence = (txnDate: string, ledgerDate: string) => {
  const a = new Date(txnDate).getTime();
  const b = new Date(ledgerDate).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0.5;
  const days = Math.abs(a - b) / 86400000;
  if (days <= 2) return 0.95;
  if (days <= 7) return 0.85;
  if (days <= 14) return 0.7;
  return 0.4;
};

const extractInvoiceRef = (text: string) => {
  const m =
    String(text || "").match(/\b(?:inv|invoice)[\s#:.-]*([A-Z0-9-]{4,})\b/i) ||
    String(text || "").match(/\b([A-Z]{2,}-\d{3,})\b/);
  return m?.[1] || null;
};

export const run: ActionRun = async ({ api, params }) => {
  const limit = Math.max(1, Math.min(20, Number(params?.limit || 8)));
  const transactionId = String(params?.transactionId || "");

  const transaction = transactionId
    ? await api.financeTransaction.findOne(transactionId, {
        select: {
          id: true,
          postedAt: true,
          amount: true,
          descriptionRaw: true,
          counterpartyRaw: true,
          status: true,
        } as any,
      })
    : null;

  const candidateTransactions = transaction
    ? [transaction]
    : await api.financeTransaction.findMany({
        first: 50,
        filter: { status: { equals: "imported" } } as any,
        sort: { postedAt: "Descending" } as any,
        select: {
          id: true,
          postedAt: true,
          amount: true,
          descriptionRaw: true,
          counterpartyRaw: true,
          status: true,
        } as any,
      });

  const ledgerEntries = await api.financeLedgerEntry.findMany({
    first: 500,
    filter: { status: { in: ["needs_approval", "approved"] } } as any,
    select: {
      id: true,
      entryDate: true,
      description: true,
      grossAmount: true,
      status: true,
      linkedTransactionIdsJson: true,
    } as any,
  });

  const output: any[] = [];

  for (const txn of candidateTransactions || []) {
    const txnRef = extractInvoiceRef(txn.descriptionRaw);
    const ranked = (ledgerEntries || [])
      .map((ledger: any) => {
        const c1 = amountConfidence(Number(txn.amount || 0), Number(ledger.grossAmount || 0));
        const c2 = dateConfidence(String(txn.postedAt || ""), String(ledger.entryDate || ""));
        const ledgerRef = extractInvoiceRef(ledger.description || "");
        const refMatched = txnRef && ledgerRef && txnRef.toLowerCase() === ledgerRef.toLowerCase();
        const confidence = Math.min(0.99, Number(((c1 * 0.55 + c2 * 0.35 + (refMatched ? 0.2 : 0)).toFixed(2))));
        return {
          ledgerEntryId: ledger.id,
          ledgerDescription: ledger.description,
          ledgerAmount: ledger.grossAmount,
          confidence,
          reasons: [
            `amount_diff=${Math.abs(Math.abs(Number(txn.amount || 0)) - Math.abs(Number(ledger.grossAmount || 0))).toFixed(2)}`,
            `date_window_days`,
            ...(refMatched ? ["invoice_ref_match"] : []),
          ],
        };
      })
      .filter((row) => row.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    output.push({
      transactionId: txn.id,
      transactionAmount: txn.amount,
      transactionDate: txn.postedAt,
      description: txn.descriptionRaw,
      suggestions: ranked,
    });
  }

  return { ok: true, matches: output };
};

export const options: ActionOptions = {};
