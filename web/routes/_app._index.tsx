import { useState, useEffect } from "react";
import { useSession } from "@gadgetinc/react";
import { Link as RouterLink, useLocation } from "react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import {
  Mail,
  CheckCircle2,
  FileText,
  TrendingUp,
  AlertCircle,
  Clock,
  Settings,
  Layers,
  MessageSquare,
  PenLine,
  LayoutDashboard,
} from "lucide-react";

// ── Customer Service Sidebar ────────────────────────────────────────
// Same pattern as settings Sidebar — will be extracted to a shared
// component once we roll it out to all Customer pages.

const customerTabs = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard, path: "/" },
  { id: "conversations", label: "Conversations", icon: MessageSquare,   path: "/conversations" },
  { id: "threads",       label: "Threads",       icon: MessageSquare,   path: "/threads" },
  { id: "triage",        label: "Triage",        icon: Layers,          path: "/triage" },
  { id: "templates",     label: "Templates",     icon: FileText,        path: "/templates",
    children: [
      { id: "templates-list", label: "Templates",  icon: FileText, path: "/templates" },
      { id: "signatures",     label: "Signatures", icon: PenLine,  path: "/signatures" },
    ],
  },
  { id: "settings",      label: "Settings",      icon: Settings,        path: "/settings" },
];

function CustomerSidebar({ currentPath }: { currentPath: string }) {
  const isActive = (path: string, children?: { path: string }[]) => {
    if (path === "/") return currentPath === "/";
    if (children) {
      return children.some((child) => currentPath === child.path || currentPath.startsWith(child.path + "/"));
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Customer</h2>
      </div>
      <nav className="space-y-1">
        {customerTabs.map(({ id, label, icon: Icon, path, children }) => (
          <div key={id}>
            <RouterLink
              to={children ? children[0].path : path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(path, children)
                  ? "bg-teal-600/10 text-teal-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{label}</span>
            </RouterLink>
            {children && (
              <div className="ml-7 mt-1 space-y-1 border-l border-slate-800 pl-3">
                {children.map((child) => (
                  <RouterLink
                    key={child.id}
                    to={child.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${
                      currentPath === child.path || currentPath.startsWith(child.path + "/")
                        ? "text-teal-400 font-medium"
                        : "text-slate-500 hover:text-white hover:bg-slate-800/50"
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

// ── Dashboard Page ──────────────────────────────────────────────────
export default function Dashboard() {
  const session = useSession();
  const user = session?.user;
  const location = useLocation();

  // Fix hydration mismatch by using client-side state
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    if (user?.firstName) {
      setDisplayName(user.firstName);
    }
  }, [user?.firstName]);

  const welcomeMessage = `Welcome back, ${displayName}`;

  return (
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-slate-950">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <h1 className="text-2xl font-semibold text-white">
            {welcomeMessage}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose a workflow to get started
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Triage Card - Primary Action */}
            <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-teal-500/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-teal-500/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Triage Queue
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Review and respond to customer emails with AI assistance
                  </p>
                  <Button asChild className="w-full bg-teal-500 hover:bg-teal-600 text-black font-medium">
                    <Link to="/triage">
                      Open Triage
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Conversations Card */}
            <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-500/10 rounded-lg">
                  <Mail className="h-6 w-6 text-slate-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Conversations
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    View and manage all email conversations
                  </p>
                  <Button asChild variant="outline" className="w-full border-slate-700 hover:bg-slate-800">
                    <Link to="/conversations">
                      View All
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Templates Card */}
            <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-500/10 rounded-lg">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Templates
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Manage email templates and responses
                  </p>
                  <Button asChild variant="outline" className="w-full border-slate-700 hover:bg-slate-800">
                    <Link to="/templates">
                      Manage Templates
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Settings Card */}
            <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-500/10 rounded-lg">
                  <Settings className="h-6 w-6 text-slate-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Settings
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Configure your account and preferences
                  </p>
                  <Button asChild variant="outline" className="w-full border-slate-700 hover:bg-slate-800">
                    <Link to="/settings">
                      Open Settings
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

          </div>

          {/* Quick Stats Row */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              {/* Urgent */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">URGENT</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </Card>

              {/* High Priority */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">HIGH PRIORITY</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </Card>

              {/* Pending Drafts */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">PENDING DRAFTS</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </Card>

              {/* Resolved Today */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">RESOLVED TODAY</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </Card>

            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">More Modules Coming Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <Card className="bg-slate-900/30 border-slate-800/50 p-6 opacity-60">
                <h3 className="text-md font-semibold text-slate-400 mb-2">
                  Finance Module
                </h3>
                <p className="text-sm text-slate-500">
                  Invoice processing, expense tracking, and financial automation
                </p>
                <div className="mt-4">
                  <span className="text-xs text-slate-600">Coming Q2 2026</span>
                </div>
              </Card>

              <Card className="bg-slate-900/30 border-slate-800/50 p-6 opacity-60">
                <h3 className="text-md font-semibold text-slate-400 mb-2">
                  Sales Module
                </h3>
                <p className="text-sm text-slate-500">
                  Lead scoring, pipeline automation, and CRM integration
                </p>
                <div className="mt-4">
                  <span className="text-xs text-slate-600">Coming Q3 2026</span>
                </div>
              </Card>

              <Card className="bg-slate-900/30 border-slate-800/50 p-6 opacity-60">
                <h3 className="text-md font-semibold text-slate-400 mb-2">
                  Marketing Module
                </h3>
                <p className="text-sm text-slate-500">
                  Campaign management, content generation, and analytics
                </p>
                <div className="mt-4">
                  <span className="text-xs text-slate-600">Coming Q4 2026</span>
                </div>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
