import { Link, Outlet, useLocation } from "react-router";
import { BrainCircuit, CalendarDays, KanbanSquare, LayoutDashboard } from "lucide-react";
import { useFindFirst } from "@gadgetinc/react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { api } from "../api";
import { EmptyState } from "@/shared/ui/EmptyState";

const NAV_ITEMS = [
  { path: "/planner", label: "Planner Home", icon: LayoutDashboard },
  { path: "/planner/personal", label: "Personal Schedule", icon: CalendarDays },
  { path: "/planner/training", label: "Scheduler Training", icon: BrainCircuit },
  { path: "/planner/board", label: "Kanban (next)", icon: KanbanSquare, disabled: true },
];

export default function PlannerModuleLayout() {
  const location = useLocation();
  const [{ data: appConfig, fetching }] = useFindFirst(api.appConfiguration, {
    select: { plannerModuleEnabled: true } as any,
  });
  const enabled = Boolean((appConfig as any)?.plannerModuleEnabled);

  if (!fetching && !enabled) {
    return (
      <div className="h-[calc(100vh-4rem)] p-8">
        <EmptyState
          title="Planner module is disabled"
          description="Enable it from Office Wizard Admin Settings before using Planner."
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 flex-shrink-0">
        <SidebarBrandHeader icon={CalendarDays} overline="PLANNER" title="OPS" />
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/planner" && location.pathname.startsWith(item.path));

            if (item.disabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/60"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
