import { Link, Outlet, useLocation } from "react-router";
import { CalendarClock, ClipboardList, Layers3, LayoutDashboard, ListChecks } from "lucide-react";
import { useFindFirst } from "@gadgetinc/react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { api } from "../api";
import { EmptyState } from "@/shared/ui/EmptyState";

const NAV_ITEMS = [
  { path: "/production/summary", label: "Suite Summary", icon: LayoutDashboard },
  { path: "/production/schedule-summary", label: "Schedule Summary", icon: ClipboardList },
  { path: "/production", label: "Schedule", icon: CalendarClock },
  { path: "/production/types", label: "Production Types", icon: ListChecks },
  { path: "/production/batches", label: "Batches", icon: Layers3 },
];

export default function ProductionModuleLayout() {
  const location = useLocation();
  const [{ data: appConfig, fetching }] = useFindFirst(api.appConfiguration, {
    select: { productionSchedulerEnabled: true } as any,
  });
  const enabled = Boolean((appConfig as any)?.productionSchedulerEnabled);

  if (!fetching && !enabled) {
    return (
      <div className="h-[calc(100vh-4rem)] p-8">
        <EmptyState
          title="Production scheduler is disabled"
          description="Enable it from application settings before using the Production module."
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 flex-shrink-0">
        <SidebarBrandHeader icon={CalendarClock} overline="PRODUCTION" title="SCHEDULE" />
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/production" && location.pathname.startsWith(item.path));

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
