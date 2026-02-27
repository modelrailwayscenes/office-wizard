import { Card } from "@/components/ui/card";

export function FinanceKpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="bg-card/50 border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
    </Card>
  );
}
