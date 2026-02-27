import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { fetchFinanceJson } from "../lib/api";

export default function FinanceLedgerPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetchFinanceJson("/finance/ledger")
      .then((res: any) => setRows(Array.isArray(res?.rows) ? res.rows : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Ledger" subtitle="Approved financial entries for reporting and reconciliation" />
      <div className="p-8">
        <Card className="bg-card/50 border-border p-6">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-left py-2">Gross</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-2">{row.date || "—"}</td>
                    <td className="py-2">{row.description || "—"}</td>
                    <td className="py-2">{row.category || "—"}</td>
                    <td className="py-2">{row.gross || "—"}</td>
                    <td className="py-2">{row.status || "draft"}</td>
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
