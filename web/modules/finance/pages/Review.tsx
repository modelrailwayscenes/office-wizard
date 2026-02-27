import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { postFinanceJson } from "../lib/api";

export default function FinanceReviewPage() {
  const [activeTab, setActiveTab] = useState("invoices");
  const [data, setData] = useState<any>({ invoices: [], unmatchedTransactions: [] });
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const refresh = async () => {
    const res = await postFinanceJson("/finance/review-invoices", {});
    setData(res);
  };

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="To Review"
        subtitle="Approve invoices/receipts and resolve unmatched transactions"
      />

      <div className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="invoices">Invoices & Receipts</TabsTrigger>
            <TabsTrigger value="transactions">Unmatched Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <Card className="bg-card/50 border-border p-6">
              <h2 className="text-base font-semibold text-foreground">Invoice approval queue</h2>
              <div className="mt-3 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">Supplier</th>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Gross</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.invoices || []).map((row: any) => (
                      <tr
                        key={row.id}
                        className="border-t border-border/60 cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedInvoice(row)}
                      >
                        <td className="py-2">{row.supplier || "Unknown"}</td>
                        <td className="py-2">{row.date || "—"}</td>
                        <td className="py-2">{row.gross || "—"}</td>
                        <td className="py-2">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <Card className="bg-card/50 border-border p-6">
              <h2 className="text-base font-semibold text-foreground">Unmatched transactions</h2>
              <div className="mt-3 overflow-auto">
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
                    {(data?.unmatchedTransactions || []).map((row: any) => (
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
          </TabsContent>
        </Tabs>
      </div>

      <Drawer open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)} direction="right">
        <DrawerContent direction="right" hideHandle className="w-full sm:max-w-xl bg-card border-border p-0">
          <div className="border-b border-border bg-card/50 px-6 py-5">
            <DrawerTitle className="text-lg font-semibold text-foreground">Invoice Review</DrawerTitle>
          </div>
          <div className="px-6 py-6 space-y-3 text-sm">
            <div>Supplier: {selectedInvoice?.supplier || "Unknown"}</div>
            <div>Date: {selectedInvoice?.date || "—"}</div>
            <div>Gross: {selectedInvoice?.gross || "—"}</div>
            <div>Status: {selectedInvoice?.status || "needs_approval"}</div>
            <div className="flex gap-2 pt-2">
              <Button size="sm">Approve</Button>
              <Button size="sm" variant="outline">Save Draft</Button>
              <Button size="sm" variant="outline">Mark Duplicate</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
