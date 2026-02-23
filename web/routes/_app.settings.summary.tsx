import { Link as RouterLink, useLocation } from "react-router";
import { useFindFirst, useFindMany, useUser } from "@gadgetinc/react";
import { api } from "../api";
import {
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";
import { HEALTH_TONE_STYLES, HealthTone, timeAgo, isStaleByHours } from "@/components/healthStatus";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/settings/profile" },
  { id: "users",        label: "Users",                  icon: UsersIcon,    path: "/settings/users" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/settings/templates" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations",           icon: LinkIcon,     path: "/settings/integrations" },
  { id: "alerts",       label: "Alerts & Notifications", icon: Bell,         path: "/settings/alerts" },
  { id: "advanced",     label: "Advanced Settings",      icon: SettingsIcon, path: "/settings/advanced" },
];

function Sidebar({ currentPath, user }: { currentPath: string; user: any }) {
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6 flex items-center justify-between px-3">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <SettingsCloseButton className="h-8 w-8 text-slate-400 hover:text-white" />
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

        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-700" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin only</p>
            </div>
            {adminTabs.map(({ id, label, icon: Icon, path }) => (
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
          </>
        )}
      </nav>
    </div>
  );
}

function SettingsBlock({
  icon: Icon,
  title,
  description,
  path,
  healthTone,
  statusLabel,
  details,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  healthTone?: HealthTone;
  statusLabel?: string;
  details?: string[];
}) {
  const tone = healthTone || "healthy";
  const toneStyle = HEALTH_TONE_STYLES[tone];
  const BadgeIcon = toneStyle.Icon;
  const badgeLabel = statusLabel || toneStyle.label;

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all group ${toneStyle.borderClass}`}>
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

      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border ${toneStyle.badgeClass}`}>
          <BadgeIcon className="h-3.5 w-3.5" />
          {badgeLabel}
        </span>
      </div>

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
  const user = useUser(api, {
    select: {
      email: true,
      firstName: true,
      lastName: true,
      roleList: { key: true },
    },
  });

  const [{ data: configData }] = useFindFirst(api.appConfiguration, {
    select: {
      connectedMailbox: true,
      microsoftConnectionStatus: true,
      microsoftLastError: true,
      microsoftTenantId: true,
      microsoftClientId: true,
      microsoftClientSecret: true,
      lastSyncAt: true,
      autoTriageEnabled: true,
      autoSendGlobalEnabled: true,
      emailNotificationsEnabled: true,
    },
  });

  const [{ data: usersData }] = useFindMany(api.user, {
    select: { id: true },
  });

  const [{ data: triageData }] = useFindMany(api.conversation, {
    first: 1,
    sort: { lastTriagedAt: "Descending" } as any,
    filter: { lastTriagedAt: { isSet: true } } as any,
    select: { lastTriagedAt: true } as any,
  });

  const [{ data: aiCommentData }] = useFindMany(api.aiComment, {
    first: 1,
    sort: { createdAt: "Descending" } as any,
    filter: { source: { equals: "triage_ai" } } as any,
    select: { createdAt: true } as any,
  });

  const [{ data: templateData }] = useFindMany(api.template, {
    first: 1,
    sort: { updatedAt: "Descending" } as any,
    select: { updatedAt: true } as any,
  });

  const [{ data: alertLogData }] = useFindMany(api.actionLog, {
    first: 1,
    sort: { performedAt: "Descending" } as any,
    select: { performedAt: true } as any,
  });

  const config = configData as any;
  const userCount = (usersData || []).length;
  const lastTriagedAt = (triageData as any)?.[0]?.lastTriagedAt;
  const lastAiAt = (aiCommentData as any)?.[0]?.createdAt;
  const lastTemplateAt = (templateData as any)?.[0]?.updatedAt;
  const lastAlertAt = (alertLogData as any)?.[0]?.performedAt;

  const TRIAGE_STALE_HOURS = 12;
  const SYNC_STALE_HOURS = 2;

  const msCredentialsMissing = config
    ? !config.microsoftTenantId || !config.microsoftClientId || !config.microsoftClientSecret
    : false;
  const msError = config
    ? config.microsoftConnectionStatus === "error" || Boolean(config.microsoftLastError)
    : false;
  const syncStale = isStaleByHours(config?.lastSyncAt, SYNC_STALE_HOURS);
  const triageStale = isStaleByHours(lastTriagedAt, TRIAGE_STALE_HOURS);
  const hasTemplates = (templateData || []).length > 0;

  let integrationsTone: HealthTone = "disabled";
  if (msError || msCredentialsMissing) {
    integrationsTone = "misconfigured";
  } else if (config?.microsoftConnectionStatus !== "connected") {
    integrationsTone = "disabled";
  } else if (syncStale) {
    integrationsTone = "degraded";
  } else {
    integrationsTone = "healthy";
  }

  const triageTone: HealthTone = config?.autoTriageEnabled
    ? triageStale ? "warning" : "healthy"
    : "disabled";
  const aiTone: HealthTone = config?.autoSendGlobalEnabled ? "healthy" : "disabled";
  const alertsTone: HealthTone = config?.emailNotificationsEnabled ? "healthy" : "warning";
  const templatesTone: HealthTone = hasTemplates ? "healthy" : "warning";
  const usersTone: HealthTone = userCount > 0 ? "healthy" : "warning";

  const riskItems: { tone: HealthTone; label: string; detail?: string }[] = [];
  if (!config?.emailNotificationsEnabled) {
    riskItems.push({ tone: "warning", label: "Alerts are disabled", detail: "Enable notifications to receive escalations." });
  }
  if (config?.autoTriageEnabled && triageStale) {
    riskItems.push({ tone: "warning", label: "Triage has not run in 12 hours", detail: `Last triage ${timeAgo(lastTriagedAt)}` });
  }
  if (msError) {
    riskItems.push({ tone: "misconfigured", label: "Microsoft sync failed", detail: config?.microsoftLastError || "Check Microsoft 365 connection settings." });
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-slate-950">

        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Settings</h1>
              <p className="text-sm text-slate-400 mt-1">Manage your Office Wizard configuration</p>
            </div>
            <SettingsCloseButton className="h-9 w-9 text-slate-300 hover:text-white" />
          </div>
        </div>

        <div className="p-8">
        {riskItems.length > 0 && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/40 px-5 py-4">
            <div className="flex items-center gap-2">
              {(() => {
                const tone = riskItems.some((item) => item.tone === "misconfigured")
                  ? "misconfigured"
                  : "warning";
                const toneStyle = HEALTH_TONE_STYLES[tone];
                const ToneIcon = toneStyle.Icon;
                return (
                  <>
                    <ToneIcon className={`h-5 w-5 ${toneStyle.textClass}`} />
                    <h2 className={`text-sm font-semibold uppercase tracking-wide ${toneStyle.textClass}`}>
                      System risks detected
                    </h2>
                  </>
                );
              })()}
            </div>
            <div className="mt-3 space-y-2">
              {riskItems.map((item, idx) => {
                const toneStyle = HEALTH_TONE_STYLES[item.tone];
                const ItemIcon = toneStyle.Icon;
                return (
                  <div key={`${item.label}-${idx}`} className="flex items-start gap-2">
                    <ItemIcon className={`h-4 w-4 mt-0.5 ${toneStyle.textClass}`} />
                    <div>
                      <div className="text-sm text-slate-200">{item.label}</div>
                      {item.detail && <div className="text-xs text-slate-400 mt-0.5">{item.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile */}
          <SettingsBlock
            icon={User2}
            title="Personal"
            description="Personal account settings"
            path="/settings/profile"
            healthTone="healthy"
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
            healthTone={usersTone}
            statusLabel={userCount > 0 ? "Healthy" : "Needs attention"}
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
            healthTone={integrationsTone}
            statusLabel={HEALTH_TONE_STYLES[integrationsTone].label}
            details={[
              config?.connectedMailbox ? `Connected: ${config.connectedMailbox}` : "No integrations connected",
              msCredentialsMissing ? "Missing Microsoft 365 credentials" : "Microsoft 365 credentials present",
              `Last sync: ${timeAgo(config?.lastSyncAt)}`,
              msError
                ? (config?.microsoftLastError ? `Last error: ${config.microsoftLastError}` : "Sync status error")
                : "Sync status healthy",
            ].filter(Boolean) as string[]}
          />

          {/* Triage & Workflow */}
          <SettingsBlock
            icon={Layers}
            title="Triage & Workflow"
            description="Email classification and routing"
            path="/settings/triage"
            healthTone={triageTone}
            statusLabel={config?.autoTriageEnabled ? (triageStale ? "Stale" : "Healthy") : "Disabled"}
            details={
              config?.autoTriageEnabled
                ? [
                    `Last triage: ${timeAgo(lastTriagedAt)}`,
                    triageStale ? "Triage overdue (12h threshold)" : "Triage running on schedule",
                    "Priority scoring active",
                  ]
                : ["Auto-triage disabled", "Enable triage to prioritise conversations"]
            }
          />

          {/* AI & Automation */}
          <SettingsBlock
            icon={Sparkles}
            title="AI & Automation"
            description="AI models and auto-responses"
            path="/settings/ai"
            healthTone={aiTone}
            statusLabel={config?.autoSendGlobalEnabled ? "Healthy" : "Disabled"}
            details={
              config?.autoSendGlobalEnabled
                ? [
                    `AI last invoked: ${timeAgo(lastAiAt)}`,
                    "Auto-draft enabled",
                    "AI classification active",
                  ]
                : ["AI automation disabled", "Enable AI for classification and drafts"]
            }
          />

          {/* Templates & Batching */}
          <SettingsBlock
            icon={FileText}
            title="Templates & Batching"
            description="Response templates and batch operations"
            path="/settings/templates"
            healthTone={templatesTone}
            statusLabel={hasTemplates ? "Healthy" : "Needs attention"}
            details={
              hasTemplates
                ? [`Last modified: ${timeAgo(lastTemplateAt)}`, "Templates configured"]
                : ["No templates created yet", "Add templates to speed up responses"]
            }
          />

          {/* Alerts & Notifications */}
          <SettingsBlock
            icon={Bell}
            title="Alerts & Notifications"
            description="Email and desktop alerts"
            path="/settings/alerts"
            healthTone={alertsTone}
            statusLabel={config?.emailNotificationsEnabled ? "Healthy" : "Warning"}
            details={
              config?.emailNotificationsEnabled
                ? [`Last alert: ${timeAgo(lastAlertAt)}`, "Configure alert preferences"]
                : ["Alerts disabled", "Enable notifications to receive escalations"]
            }
          />

          {/* Security & Compliance */}
          <SettingsBlock
            icon={Shield}
            title="Security & Compliance"
            description="Security settings and audit logs"
            path="/settings/security"
            healthTone="healthy"
            details={["Configure security policies", "Review audit logs", "Manage access controls"]}
          />

          {/* Advanced */}
          <SettingsBlock
            icon={SettingsIcon}
            title="Advanced"
            description="Advanced configuration options"
            path="/settings/advanced"
            healthTone="healthy"
            details={["Developer settings", "System configuration", "Debug options"]}
          />
        </div>
        </div>
      </div>
    </div>
  );
}