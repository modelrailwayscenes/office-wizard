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
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";

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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
        <SidebarBrandHeader icon={LayoutTemplate} overline="MARKETING" title="NEWSLETTER" />
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/marketing/newsletter" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-teal-600/10 text-teal-400 font-medium"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
