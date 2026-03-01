import { Link as RouterLink } from "react-router";
import { useFindMany } from "@gadgetinc/react";
import {
  LayoutDashboard,
  MessageSquare,
  Layers,
  FileText,
  PenLine,
  Settings,
  ShieldAlert,
  CircleHelp,
  ChevronsUpDown,
} from "lucide-react";
import { api } from "@/api";

const BASE = "/customer/support";

const customerTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: BASE },
  { id: "conversations", label: "Conversations", icon: MessageSquare, path: `${BASE}/conversations` },
  { id: "threads", label: "Threads", icon: MessageSquare, path: `${BASE}/threads` },
  { id: "triage", label: "Triage", icon: Layers, path: `${BASE}/triage-queue` },
  { id: "quarantine", label: "Quarantine", icon: ShieldAlert, path: `${BASE}/quarantine` },
  {
    id: "templates",
    label: "Playbooks",
    icon: FileText,
    path: `${BASE}/templates`,
    children: [
      { id: "templates-list", label: "Playbooks", icon: FileText, path: `${BASE}/templates` },
      { id: "signatures", label: "Signatures", icon: PenLine, path: `${BASE}/signatures` },
    ],
  },
  { id: "settings", label: "Settings", icon: Settings, path: `${BASE}/settings` },
];

export function CustomerSupportSidebar({ currentPath }: { currentPath: string }) {
  const [{ data: quarantineData }] = useFindMany(api.emailQuarantine, {
    filter: { status: { equals: "pending_review" } },
    select: { id: true },
    first: 200,
  });

  const quarantineCount = (quarantineData as any[] | undefined)?.length ?? 0;

  const isActive = (path: string, children?: { path: string }[]) => {
    if (path === BASE) return currentPath === BASE || currentPath === `${BASE}/`;
    if (children) {
      return children.some((child) => currentPath === child.path || currentPath.startsWith(`${child.path}/`));
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 flex-shrink-0 flex flex-col">
      {/* Module Switcher */}
      <div className="flex items-center justify-between p-2 mb-6 bg-accent/30 rounded-lg border border-sidebar-border cursor-pointer hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-xs text-primary-foreground">CS</div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate text-foreground">Customer</p>
            <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tight">Support</p>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>

      <nav className="space-y-1">
        {customerTabs.map(({ id, label, icon: Icon, path, children }) => (
          <div key={id}>
            <RouterLink
              to={children ? children[0].path : path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(path, children)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-[13px] font-medium">{label}</span>
              {id === "quarantine" && quarantineCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold">
                  {quarantineCount}
                </span>
              )}
            </RouterLink>
            {children && (
              <div className="ml-7 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                {children.map((child) => (
                  <RouterLink
                    key={child.id}
                    to={child.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${
                      currentPath === child.path || currentPath.startsWith(`${child.path}/`)
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{child.label}</span>
                  </RouterLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}