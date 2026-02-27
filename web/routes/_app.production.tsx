import { Link, Outlet, useLocation } from "react-router";
import { CalendarClock, ClipboardList, Layers3, LayoutDashboard, ListChecks } from "lucide-react";
import { useFindFirst, useFindMany } from "@gadgetinc/react";
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
  const [{ data: jobsForSidebar }] = useFindMany(api.productionJob, {
    first: 500,
    select: {
      id: true,
      source: true,
      status: true,
      priorityBand: true,
      stationOrText: true,
      notes: true,
    } as any,
  });
  const enabled = Boolean((appConfig as any)?.productionSchedulerEnabled);
  const pendingScheduleActions = ((jobsForSidebar as any[] | undefined) || []).filter((job) => {
    const missingStationName = job?.source === "shopify_order" && !String(job?.stationOrText || "").trim();
    if (!missingStationName) return false;
    let workflowStatus = "not_started";
    try {
      const notes = typeof job?.notes === "string" ? JSON.parse(job.notes) : (job?.notes || {});
      workflowStatus = String(notes?.emailWorkflow?.status || "not_started");
    } catch {
      workflowStatus = "not_started";
    }
    return workflowStatus === "drafted" || workflowStatus === "not_started";
  }).length;
  const urgentQueuedCount = ((jobsForSidebar as any[] | undefined) || []).filter((job) => {
    const status = String(job?.status || "");
    const priorityBand = String(job?.priorityBand || "");
    return status === "queued" && (priorityBand === "P0" || priorityBand === "P1");
  }).length;

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
                <span className="flex-1">{item.label}</span>
                {item.path === "/production/schedule-summary" && pendingScheduleActions > 0 ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {pendingScheduleActions}
                  </span>
                ) : null}
                {item.path === "/production" && urgentQueuedCount > 0 ? (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                    {urgentQueuedCount}
                  </span>
                ) : null}
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
