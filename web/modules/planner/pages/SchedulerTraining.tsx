import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/shared/ui/PageHeader";
import { toast } from "sonner";

export default function SchedulerTrainingPage() {
  const [feedbackText, setFeedbackText] = useState("");
  const [examples, setExamples] = useState<string[]>([]);

  const submitFeedback = () => {
    const text = feedbackText.trim();
    if (!text) {
      toast.error("Enter feedback first");
      return;
    }
    setExamples((prev) => [text, ...prev].slice(0, 12));
    setFeedbackText("");
    toast.success("Training feedback saved");
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
            <Button onClick={submitFeedback}>Save feedback</Button>
          </div>
        </Card>

        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-base font-semibold text-foreground">Recent feedback signals</h2>
          <div className="mt-3 space-y-2">
            {examples.length === 0 ? (
              <div className="text-sm text-muted-foreground">No feedback examples yet.</div>
            ) : (
              examples.map((example, idx) => (
                <div key={`${example}-${idx}`} className="rounded border border-border bg-muted/20 px-3 py-2 text-sm">
                  {example}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
