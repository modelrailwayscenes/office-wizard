import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { fetchFinanceJson } from "../lib/api";

export default function FinanceEvidencePage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetchFinanceJson("/finance/evidence")
      .then((res: any) => setRows(Array.isArray(res?.rows) ? res.rows : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Evidence Vault" subtitle="Invoice, receipt, and email evidence index" />
      <div className="p-8">
        <Card className="bg-card/50 border-border p-6">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Supplier</th>
                  <th className="text-left py-2">Invoice #</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-2">{row.type || "other"}</td>
                    <td className="py-2">{row.supplierName || "—"}</td>
                    <td className="py-2">{row.invoiceNumber || "—"}</td>
                    <td className="py-2">{row.amount || "—"}</td>
                    <td className="py-2">{row.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
