import { RouteHandler } from "gadget-server";

const currency = (amount: number) => `£${Number(amount || 0).toFixed(2)}`;

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const now = new Date();
    const taxYearStart = new Date(now.getFullYear(), 3, 6);
    if (now < taxYearStart) taxYearStart.setFullYear(taxYearStart.getFullYear() - 1);

    const ledger = await api.financeLedgerEntry.findMany({
      first: 1000,
      select: {
        id: true,
        direction: true,
        grossAmount: true,
        entryDate: true,
        status: true,
        linkedDocumentIdsJson: true,
        category: { id: true },
      } as any,
    });
    const transactions = await api.financeTransaction.findMany({
      first: 1000,
      select: { id: true, status: true } as any,
    });
    const accounts = await api.financeAccount.findMany({
      first: 100,
      select: { id: true, displayName: true, balanceCurrent: true } as any,
    });

    let incomeMtd = 0;
    let expenseMtd = 0;
    let incomeTy = 0;
    let expenseTy = 0;
    let invoicesToApprove = 0;
    let missingEvidence = 0;
    let uncategorisedEntries = 0;

    for (const row of ledger || []) {
      const date = row.entryDate ? new Date(row.entryDate) : null;
      const gross = Number(row.grossAmount || 0);
      const inMonth = date ? date >= startOfMonth : false;
      const inTaxYear = date ? date >= taxYearStart : false;
      const income = row.direction === "income";
      if (inMonth) {
        if (income) incomeMtd += gross;
        else expenseMtd += gross;
      }
      if (inTaxYear) {
        if (income) incomeTy += gross;
        else expenseTy += gross;
      }
      if (row.status === "needs_approval") invoicesToApprove++;
      const docs = Array.isArray(row.linkedDocumentIdsJson) ? row.linkedDocumentIdsJson : [];
      if (!docs.length) missingEvidence++;
      if (!row.category?.id) uncategorisedEntries++;
    }

    const unmatchedTransactions = (transactions || []).filter((t) => t.status === "imported").length;
    const cashByAccount = (accounts || []).map((a) => ({
      accountId: a.id,
      name: a.displayName || "Account",
      balance: currency(Number(a.balanceCurrent || 0)),
    }));

    await reply.send({
      ok: true,
      generatedAt: new Date().toISOString(),
      kpis: {
        incomeMtd: currency(incomeMtd),
        expenseMtd: currency(expenseMtd),
        netMtd: currency(incomeMtd - expenseMtd),
        netTaxYear: currency(incomeTy - expenseTy),
      },
      queues: {
        invoicesToApprove,
        unmatchedTransactions,
        missingEvidence,
        uncategorisedEntries,
      },
      cashByAccount,
    });
  } catch (error) {
    logger.error({ error }, "Finance dashboard route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance dashboard failed" });
  }
};

export default route;
