import { Link as RouterLink, useLocation } from "react-router";
import { useFindFirst, useFindMany, useUser } from "@gadgetinc/react";
import { api } from "../api";
import {
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
  CheckCircle2, XCircle, Clock, ArrowRight,
} from "lucide-react";

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/settings/profile" },
  { id: "users",        label: "Users",                  icon: UsersIcon,    path: "/settings/users" },
  { id: "integrations", label: "Integrations",           icon: LinkIcon,     path: "/settings/integrations" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/settings/templates" },
  { id: "alerts",       label: "Alerts & Notifications", icon: Bell,         path: "/settings/alerts" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/settings/security" },
  { id: "advanced",     label: "Admin Only",               icon: SettingsIcon, path: "/settings/advanced" },
];

function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Settings</h2>
      </div>
      <nav className="space-y-1">
        {tabs.map(({ id, label, icon: Icon, path }) => (
          <RouterLink
            key={id}
            to={path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentPath === path
                ? "bg-teal-600/10 text-teal-400 font-medium"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{label}</span>
          </RouterLink>
        ))}
      </nav>
    </div>
  );
}

function SettingsBlock({
  icon: Icon,
  title,
  description,
  path,
  status,
  details,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  status?: "active" | "inactive" | "warning";
  details?: string[];
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700/50 rounded-lg">
            <Icon className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>
        <RouterLink
          to={path}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors"
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Edit</span>
        </RouterLink>
      </div>

      {status && (
        <div className="flex items-center gap-2 mb-3">
          {status === "active" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-teal-400">Active</span>
            </>
          )}
          {status === "inactive" && (
            <>
              <XCircle className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Not configured</span>
            </>
          )}
          {status === "warning" && (
            <>
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">Needs attention</span>
            </>
          )}
        </div>
      )}

      {details && details.length > 0 && (
        <ul className="space-y-1.5 mb-4">
          {details.map((detail, idx) => (
            <li key={idx} className="text-sm text-slate-400 flex items-center gap-2">
              <span className="text-slate-600">•</span>
              {detail}
            </li>
          ))}
        </ul>
      )}


    </div>
  );
}

export default function SettingsSummaryPage() {
  const location = useLocation();
  const user = useUser(api);

  const [{ data: configData }] = useFindFirst(api.appConfiguration, {
    select: {
      connectedMailbox: true,
      microsoftConnectionStatus: true,
      autoTriageEnabled: true,
      autoSendGlobalEnabled: true,
      emailNotificationsEnabled: true,
    },
  });

  const [{ data: usersData }] = useFindMany(api.user, {
    select: { id: true },
  });

  const config = configData as any;
  const userCount = (usersData || []).length;

  // Determine statuses
  const integrationsStatus = config?.microsoftConnectionStatus === "connected" ? "active" : "inactive";
  const triageStatus = config?.autoTriageEnabled ? "active" : "inactive";
  const aiStatus = config?.autoSendGlobalEnabled ? "active" : "inactive";
  const alertsStatus = config?.emailNotificationsEnabled ? "active" : "inactive";

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-slate-950 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your Office Wizard configuration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile */}
          <SettingsBlock
            icon={User2}
            title="Personal"
            description="Personal account settings"
            path="/settings/profile"
            status="active"
            details={[
              user?.email || "No email",
              user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Name not set",
            ]}
          />

          {/* Users */}
          <SettingsBlock
            icon={UsersIcon}
            title="Users"
            description="Team member management"
            path="/settings/users"
            status={userCount > 0 ? "active" : "inactive"}
            details={[
              `${userCount} ${userCount === 1 ? "user" : "users"}`,
              "Manage roles and permissions",
            ]}
          />

          {/* Integrations */}
          <SettingsBlock
            icon={LinkIcon}
            title="Integrations"
            description="Connect external services"
            path="/settings/integrations"
            status={integrationsStatus}
            details={
              config?.connectedMailbox
                ? [`Connected: ${config.connectedMailbox}`, "Microsoft 365 sync active"]
                : ["No integrations connected", "Connect Microsoft 365 to get started"]
            }
          />

          {/* Triage & Workflow */}
          <SettingsBlock
            icon={Layers}
            title="Triage & Workflow"
            description="Email classification and routing"
            path="/settings/triage"
            status={triageStatus}
            details={
              config?.autoTriageEnabled
                ? ["Auto-triage enabled", "Priority scoring active", "SLA targets configured"]
                : ["Auto-triage disabled", "Configure classification rules"]
            }
          />

          {/* AI & Automation */}
          <SettingsBlock
            icon={Sparkles}
            title="AI & Automation"
            description="AI models and auto-responses"
            path="/settings/ai"
            status={aiStatus}
            details={
              config?.autoSendGlobalEnabled
                ? ["Auto-draft enabled", "AI classification active", "Response generation on"]
                : ["Auto-draft disabled", "Configure AI settings"]
            }
          />

          {/* Templates & Batching */}
          <SettingsBlock
            icon={FileText}
            title="Templates & Batching"
            description="Response templates and batch operations"
            path="/settings/templates"
            details={["Configure response templates", "Set up batch processing rules"]}
          />

          {/* Alerts & Notifications */}
          <SettingsBlock
            icon={Bell}
            title="Alerts & Notifications"
            description="Email and desktop alerts"
            path="/settings/alerts"
            status={alertsStatus}
            details={
              config?.emailNotificationsEnabled
                ? ["Email notifications enabled", "Configure alert preferences"]
                : ["Email notifications disabled", "Set up notification rules"]
            }
          />

          {/* Security & Compliance */}
          <SettingsBlock
            icon={Shield}
            title="Security & Compliance"
            description="Security settings and audit logs"
            path="/settings/security"
            details={["Configure security policies", "Review audit logs", "Manage access controls"]}
          />

          {/* Advanced */}
          <SettingsBlock
            icon={SettingsIcon}
            title="Advanced"
            description="Advanced configuration options"
            path="/settings/advanced"
            details={["Developer settings", "System configuration", "Debug options"]}
          />
        </div>
      </div>
    </div>
  );
}
