import { Bell, CircleCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notifications = [
  { id: "triage-refresh", title: "Triage queue refreshed", detail: "New conversations are ready for review.", level: "info" },
  { id: "template-sync", title: "Template import complete", detail: "Customer support templates are up to date.", level: "success" },
];

export function RefinedNotificationCenter() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Notifications">
          <Bell className="h-4 w-4" />
          {notifications.length > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {notifications.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((note) => (
          <DropdownMenuItem key={note.id} className="items-start gap-2 py-2">
            {note.level === "success" ? (
              <CircleCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
            )}
            <span className="flex flex-col gap-0.5">
              <span className="text-sm">{note.title}</span>
              <span className="text-xs text-muted-foreground">{note.detail}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
