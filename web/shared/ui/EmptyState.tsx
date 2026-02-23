import React from "react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="p-8 text-center text-slate-500">
      <div className="text-lg text-slate-300 font-semibold">{title}</div>
      {description && <div className="text-sm text-slate-500 mt-1">{description}</div>}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
