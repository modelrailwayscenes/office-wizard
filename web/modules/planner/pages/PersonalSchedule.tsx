import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Clock3, RefreshCw } from "lucide-react";

const BLOCKS = [
  { id: "b1", title: "Pick regular orders", window: "09:15 - 10:00", type: "timed", risk: "healthy" },
  { id: "b2", title: "Personalised sign QA", window: "10:15 - 11:00", type: "timed", risk: "at_risk" },
  { id: "b3", title: "Pack + label batch", window: "11:00 - 12:00", type: "bucket", risk: "healthy" },
  { id: "b4", title: "Replacement order dispatch", window: "12:00 - 12:30", type: "timed", risk: "breached" },
];

export default function PersonalSchedulePage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Personal Schedule"
        subtitle="Timed blocks + flexible buckets with one-click replan"
        actions={
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-plan day
          </Button>
        }
      />

      <div className="p-8 space-y-4">
        {BLOCKS.map((block) => (
          <Card key={block.id} className="bg-card/50 border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{block.title}</div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                  <Clock3 className="h-3 w-3" />
                  {block.window} · {block.type === "timed" ? "Timed block" : "Flexible bucket"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{block.risk}</Badge>
                <Button size="sm" variant="outline">Start</Button>
                <Button size="sm">Complete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
