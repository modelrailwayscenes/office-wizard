import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { fetchFinanceJson, postFinanceJson } from "../lib/api";

export default function FinanceReportsPage() {
  const [hmrcRows, setHmrcRows] = useState<any[]>([]);

  useEffect(() => {
    fetchFinanceJson("/finance/reports-hmrc")
      .then((res: any) => setHmrcRows(Array.isArray(res?.rows) ? res.rows : []))
      .catch(() => setHmrcRows([]));
  }, []);

  const runExport = async () => {
    await postFinanceJson("/finance/export", {});
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Reports"
        subtitle="Monthly, tax-year, reconciliation, and export packs"
        actions={<Button onClick={runExport}>Generate export</Button>}
      />
      <div className="p-8">
        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">HMRC summary</h2>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Bucket</th>
                  <th className="text-left py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {hmrcRows.map((row) => (
                  <tr key={row.hmrcBucketId} className="border-t border-border/60">
                    <td className="py-2">{row.hmrcBucketId || "unmapped"}</td>
                    <td className="py-2">{row.total || "£0.00"}</td>
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
