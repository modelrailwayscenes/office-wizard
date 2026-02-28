import { useMemo } from "react";
import { useFindFirst } from "@gadgetinc/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Clock3, RefreshCw } from "lucide-react";
import { api } from "@/api";

const asArray = <T = any>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const riskLabel = (startAt: string | undefined) => {
  if (!startAt) return "healthy";
  const delta = new Date(startAt).getTime() - Date.now();
  if (delta < 0) return "breached";
  if (delta <= 6 * 60 * 60 * 1000) return "at_risk";
  return "healthy";
};

export default function PersonalSchedulePage() {
  const [{ data: configData }, refreshConfig] = useFindFirst(api.appConfiguration, {
    select: { plannerScheduleBlocksJson: true } as any,
  });
  const blocks = useMemo(
    () =>
      asArray<any>((configData as any)?.plannerScheduleBlocksJson).sort(
        (a, b) => new Date(a?.startAt || 0).getTime() - new Date(b?.startAt || 0).getTime()
      ),
    [configData]
  );

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Personal Schedule"
        subtitle="Timed blocks + flexible buckets with one-click replan"
        actions={
          <Button variant="outline" onClick={() => refreshConfig()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh schedule
          </Button>
        }
      />

      <div className="p-8 space-y-4">
        {blocks.map((block) => (
          <Card key={block.id} className="bg-card/50 border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{block.taskTitle || block.title || "Task"}</div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                  <Clock3 className="h-3 w-3" />
                  {(block.startAt && block.endAt)
                    ? `${new Date(block.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(block.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : block.window || "—"}{" "}
                  · {block.blockType === "timed" ? "Timed block" : "Flexible bucket"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{riskLabel(block.startAt)}</Badge>
                <Button size="sm" variant="outline">Start</Button>
                <Button size="sm">Complete</Button>
              </div>
            </div>
          </Card>
        ))}
        {blocks.length === 0 ? (
          <Card className="bg-card/50 border-border p-6 text-sm text-muted-foreground">
            No schedule blocks yet. Generate a plan from Planner Home.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
