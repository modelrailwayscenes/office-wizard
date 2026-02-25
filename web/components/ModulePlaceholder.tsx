import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="flex-1 overflow-auto">
        <div className="border-b border-border bg-card/50 px-8 py-6">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Module placeholder</p>
        </div>

        <div className="p-8">
          <div className="max-w-2xl rounded-2xl border border-border bg-card/40 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-border bg-muted/60 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Coming soon</h2>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
            <div className="mt-5">
              <Button asChild variant="outline">
                <Link to="/customer/support">Back to Customer</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
