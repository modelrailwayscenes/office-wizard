import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { fetchFinanceJson } from "../lib/api";
import { FinanceKpiCard } from "../components/FinanceKpiCard";

export default function FinanceDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchFinanceJson("/finance/dashboard")
      .then((res) => {
        if (!mounted) return;
        setData(res);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || "Unable to load finance dashboard");
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Finance Dashboard"
        subtitle="Monthly and tax-year overview for UK operations"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/finance/review">Open To Review</Link>
            </Button>
            <Button asChild>
              <Link to="/finance/ledger">Open Ledger</Link>
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {error ? (
          <Card className="bg-card/50 border-border p-4 text-sm text-muted-foreground">
            {error}
          </Card>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <FinanceKpiCard label="Income (MTD)" value={data?.kpis?.incomeMtd ?? "£0.00"} />
          <FinanceKpiCard label="Expenses (MTD)" value={data?.kpis?.expenseMtd ?? "£0.00"} />
          <FinanceKpiCard label="Net (MTD)" value={data?.kpis?.netMtd ?? "£0.00"} />
          <FinanceKpiCard label="Net (Tax Year)" value={data?.kpis?.netTaxYear ?? "£0.00"} />
        </div>

        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use To Review to approve invoice drafts and Transactions to reconcile imports.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/finance/review">Invoices & Unmatched</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/finance/transactions">Transactions</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/finance/evidence">Evidence Vault</Link>
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card/50 border-border p-6">
            <h3 className="text-base font-semibold text-foreground">Review queues</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div>Invoices to approve: {data?.queues?.invoicesToApprove ?? 0}</div>
              <div>Unmatched transactions: {data?.queues?.unmatchedTransactions ?? 0}</div>
              <div>Missing evidence: {data?.queues?.missingEvidence ?? 0}</div>
              <div>Uncategorised entries: {data?.queues?.uncategorisedEntries ?? 0}</div>
            </div>
          </Card>
          <Card className="bg-card/50 border-border p-6">
            <h3 className="text-base font-semibold text-foreground">Cash by account</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {Array.isArray(data?.cashByAccount) && data.cashByAccount.length > 0 ? (
                data.cashByAccount.map((row: any) => (
                  <div key={row.accountId || row.name} className="flex items-center justify-between">
                    <span>{row.name}</span>
                    <span>{row.balance}</span>
                  </div>
                ))
              ) : (
                <div>No connected accounts yet.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
