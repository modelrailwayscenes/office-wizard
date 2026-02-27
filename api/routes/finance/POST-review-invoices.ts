import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const ledger = await api.financeLedgerEntry.findMany({
      first: 300,
      filter: { status: { in: ["needs_approval", "draft"] } } as any,
      sort: { entryDate: "Descending" } as any,
      select: {
        id: true,
        entryDate: true,
        grossAmount: true,
        status: true,
        description: true,
        counterparty: { id: true, name: true },
      } as any,
    });
    const unmatched = await api.financeTransaction.findMany({
      first: 300,
      filter: { status: { equals: "imported" } } as any,
      sort: { postedAt: "Descending" } as any,
      select: { id: true, postedAt: true, amount: true, counterpartyRaw: true, status: true } as any,
    });
    await reply.send({
      ok: true,
      invoices: (ledger || []).map((row) => ({
        id: row.id,
        supplier: row.counterparty?.name || null,
        date: row.entryDate || null,
        gross: row.grossAmount != null ? `£${Number(row.grossAmount).toFixed(2)}` : null,
        status: row.status,
        description: row.description,
      })),
      unmatchedTransactions: (unmatched || []).map((row) => ({
        id: row.id,
        date: row.postedAt || null,
        amount: `£${Number(row.amount || 0).toFixed(2)}`,
        merchant: row.counterpartyRaw || null,
        status: row.status,
      })),
    });
  } catch (error) {
    logger.error({ error }, "Finance review queue route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance review failed" });
  }
};

export default route;
