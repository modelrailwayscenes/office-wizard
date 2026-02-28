import { useState } from "react";
import { useFindFirst, useGlobalAction } from "@gadgetinc/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/shared/ui/PageHeader";
import { toast } from "sonner";
import { api } from "@/api";

export default function SchedulerTrainingPage() {
  const [feedbackText, setFeedbackText] = useState("");
  const [{ data: configData }, refreshConfig] = useFindFirst(api.appConfiguration, {
    select: { plannerFeedbackLogJson: true } as any,
  });
  const [{ fetching: savingFeedback }, submitFeedback] = useGlobalAction(api.submitPlannerSchedulerFeedback);

  const examples = Array.isArray((configData as any)?.plannerFeedbackLogJson)
    ? ((configData as any).plannerFeedbackLogJson as any[])
    : [];

  const saveFeedback = async () => {
    const text = feedbackText.trim();
    if (!text) {
      toast.error("Enter feedback first");
      return;
    }
    try {
      await submitFeedback({ signal: "bad", reason: text } as any);
      await refreshConfig();
      setFeedbackText("");
      toast.success("Training feedback saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save feedback");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Scheduler Training"
        subtitle="Teach planning behavior through correction feedback"
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Add correction feedback</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Example: “Do not schedule print setup after 16:00 on weekdays”.
          </p>
          <div className="mt-4 space-y-2">
            <Input
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe rule correction or preference..."
            />
            <Button onClick={saveFeedback} disabled={savingFeedback}>
              {savingFeedback ? "Saving..." : "Save feedback"}
            </Button>
          </div>
        </Card>

        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Recent feedback signals</h2>
          <div className="mt-3 space-y-2">
            {examples.length === 0 ? (
              <div className="text-sm text-muted-foreground">No feedback examples yet.</div>
            ) : (
              examples.slice(0, 20).map((example, idx) => (
                <div key={`${example?.id || idx}`} className="rounded border border-border bg-muted/20 px-3 py-2 text-sm">
                  <span className={example?.signal === "good" ? "text-green-500" : "text-amber-500"}>
                    {example?.signal === "good" ? "Accepted" : "Correction"}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {example?.reason || "No details"} ·{" "}
                    {example?.createdAt ? new Date(example.createdAt).toLocaleString() : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
