import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { fetchFinanceJson } from "../lib/api";

export default function FinanceTransactionsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetchFinanceJson("/finance/transactions")
      .then((res: any) => setRows(Array.isArray(res?.rows) ? res.rows : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Transactions" subtitle="Raw imported transactions from connected providers" />
      <div className="p-8">
        <Card className="bg-card/50 border-border p-6">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Merchant</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-2">{row.date || "—"}</td>
                    <td className="py-2">{row.amount || "—"}</td>
                    <td className="py-2">{row.merchant || "—"}</td>
                    <td className="py-2">{row.status || "imported"}</td>
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
