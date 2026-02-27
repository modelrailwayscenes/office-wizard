import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { postFinanceJson } from "../lib/api";

export default function FinanceSettingsPage() {
  const [message, setMessage] = useState<string>("");

  const runBootstrap = async () => {
    await postFinanceJson("/finance/settings-bootstrap", {});
    setMessage("Finance defaults seeded.");
  };
  const connectTrueLayer = async () => {
    const res = await postFinanceJson("/finance/settings-truelayer-connect", {});
    if (res?.authUrl) window.open(res.authUrl, "_blank", "noopener,noreferrer");
  };
  const syncTrueLayer = async () => {
    const res = await postFinanceJson("/finance/settings-truelayer-sync", {});
    setMessage(`Synced ${res?.accountsUpserted || 0} accounts and ${res?.transactionsUpserted || 0} transactions.`);
  };
  const ingestEmails = async () => {
    const res = await postFinanceJson("/finance/settings-email-ingest", {});
    setMessage(`Email ingest: ${res?.createdLedgerEntries || 0} ledger drafts, ${res?.duplicateCandidates || 0} duplicates.`);
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Finance Settings" subtitle="Categories, mappings, connectors, and automation rules" />
      <div className="p-8 space-y-4">
        {message ? <Card className="bg-card/50 border-border p-4 text-sm text-muted-foreground">{message}</Card> : null}
        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Accounting mode</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cash basis is active for v1. Data structures remain accrual-ready for future expansion.
          </p>
        </Card>
        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Tax year</h2>
          <p className="text-sm text-muted-foreground mt-1">
            UK tax year fixed: 6 April to 5 April.
          </p>
        </Card>
        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Finance bootstrap</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Seed periods, categories, and automation rules.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={runBootstrap}>Seed defaults</Button>
            <Button variant="outline" onClick={ingestEmails}>Ingest finance emails</Button>
          </div>
        </Card>
        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Open Banking (TrueLayer)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect TrueLayer and sync bank transactions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={connectTrueLayer}>Connect TrueLayer</Button>
            <Button variant="outline" onClick={syncTrueLayer}>Sync transactions</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
