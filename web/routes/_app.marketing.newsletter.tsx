import { Link, Outlet, useLocation } from "react-router";
import {
  LayoutDashboard,
  Wand2,
  LayoutTemplate,
  Blocks,
  Palette,
  CalendarDays,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/marketing/newsletter", label: "Dashboard", icon: LayoutDashboard },
  { path: "/marketing/newsletter/create", label: "Create Newsletter", icon: Wand2 },
  { path: "/marketing/newsletter/templates", label: "Templates", icon: LayoutTemplate },
  { path: "/marketing/newsletter/blocks", label: "Block Library", icon: Blocks },
  { path: "/marketing/newsletter/brand", label: "Brand Settings", icon: Palette },
  { path: "/marketing/newsletter/calendar", label: "Campaign Calendar", icon: CalendarDays },
  { path: "/marketing/newsletter/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/marketing/newsletter/settings", label: "Settings", icon: Settings },
];

export default function MarketingNewsletterLayout() {
  const location = useLocation();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <Link to="/marketing/newsletter" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-50 leading-tight">Newsletter</h1>
              <p className="text-xs text-slate-400">Builder</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/marketing/newsletter" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-teal-500/15 text-teal-400 font-medium border border-teal-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500">Office Wizard</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
