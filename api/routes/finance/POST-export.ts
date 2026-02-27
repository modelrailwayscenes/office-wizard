import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const generatedAt = new Date().toISOString();
    const ledgerRows = await api.financeLedgerEntry.findMany({
      first: 5000,
      sort: { entryDate: "Descending" } as any,
      select: {
        id: true,
        entryDate: true,
        description: true,
        direction: true,
        grossAmount: true,
        netAmount: true,
        vatAmount: true,
        status: true,
      } as any,
    });
    const evidenceRows = await api.financeDocument.findMany({
      first: 5000,
      sort: { capturedAt: "Descending" } as any,
      select: {
        id: true,
        type: true,
        supplierName: true,
        invoiceNumber: true,
        amount: true,
        source: true,
        sourceRef: true,
      } as any,
    });

    const payload = {
      ok: true,
      generatedAt,
      dateRange: "all_time",
      ledgerCount: (ledgerRows || []).length,
      evidenceCount: (evidenceRows || []).length,
      ledgerRows,
      evidenceIndex: evidenceRows,
    };

    await api.financeAuditLog.create({
      entityType: "finance_export",
      entityId: generatedAt,
      action: "export_created",
      actorEmail: "system",
      reason: "manual_export",
      beforeState: {},
      afterState: { ledgerCount: payload.ledgerCount, evidenceCount: payload.evidenceCount },
      metadata: { generatedAt, dateRange: "all_time" },
      occurredAt: generatedAt,
    } as any);

    await reply.send(payload);
  } catch (error) {
    logger.error({ error }, "Finance export route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance export failed" });
  }
};

export default route;
