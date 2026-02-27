import { Link, Outlet, useLocation } from "react-router";
import { BarChart3, FileSearch, Landmark, ReceiptText, ScrollText, Settings2, Vault } from "lucide-react";
import { useFindFirst } from "@gadgetinc/react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { api } from "../api";
import { EmptyState } from "@/shared/ui/EmptyState";

const NAV_ITEMS = [
  { path: "/finance", label: "Dashboard", icon: BarChart3 },
  { path: "/finance/review", label: "To Review", icon: FileSearch },
  { path: "/finance/ledger", label: "Ledger", icon: ScrollText },
  { path: "/finance/transactions", label: "Transactions", icon: Landmark },
  { path: "/finance/evidence", label: "Evidence Vault", icon: Vault },
  { path: "/finance/reports", label: "Reports", icon: ReceiptText },
  { path: "/finance/settings", label: "Settings", icon: Settings2 },
];

export default function FinanceModuleLayout() {
  const location = useLocation();
  const [{ data: appConfig, fetching }] = useFindFirst(api.appConfiguration, {
    select: { financeModuleEnabled: true } as any,
  });
  const enabled = Boolean((appConfig as any)?.financeModuleEnabled);

  if (!fetching && !enabled) {
    return (
      <div className="h-[calc(100vh-4rem)] p-8">
        <EmptyState
          title="Finance module is disabled"
          description="Enable it from application settings before using Finance."
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 flex-shrink-0">
        <SidebarBrandHeader icon={Landmark} overline="FINANCE" title="UK" />
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/finance" && location.pathname.startsWith(item.path));

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
