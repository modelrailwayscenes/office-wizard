import { Link as RouterLink, useLocation } from "react-router";
import { useFindFirst, useFindMany, useUser } from "@gadgetinc/react";
import { api } from "../api";
import {
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";
import { HEALTH_TONE_STYLES, HealthTone, timeAgo, isStaleByHours } from "@/components/healthStatus";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";
import { SettingsScopePill } from "@/components/settings/SettingsScopePill";

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/customer/support/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/customer/support/settings/profile" },
  { id: "users",        label: "Users",                  icon: UsersIcon,    path: "/customer/support/settings/users" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/customer/support/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/customer/support/settings/ai" },
  { id: "templates",    label: "Playbooks & Batching",   icon: FileText,     path: "/customer/support/settings/templates" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/customer/support/settings/security" },
];

function Sidebar({ currentPath, user }: { currentPath: string; user: any }) {
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => tab.id === "profile");

  return (
    <div className="w-64 bg-card/50 border-r border-border p-4 flex-shrink-0">
      <div className="mb-6 flex items-center justify-between px-3">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <SettingsCloseButton className="h-8 w-8 text-muted-foreground hover:text-foreground" />
      </div>
      <nav className="space-y-1">
        {visibleTabs.map(({ id, label, icon: Icon, path }) => (
          <RouterLink
            key={id}
            to={path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentPath === path
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
  healthTone,
  statusLabel,
  details,
  ctaLabel,
  lastUpdatedAt,
  emptyGuidance,
  scope,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  healthTone?: HealthTone;
  statusLabel?: string;
  details?: string[];
  ctaLabel?: string;
  lastUpdatedAt?: string | Date | null;
  emptyGuidance?: string[];
  scope?: "global" | "module" | "override" | "personal" | "admin";
}) {
  const tone = healthTone || "healthy";
  const toneStyle = HEALTH_TONE_STYLES[tone];
  const BadgeIcon = toneStyle.Icon;
  const badgeLabel = (statusLabel || toneStyle.label).toUpperCase();

  return (
    <div className={`bg-muted/50 border border-border rounded-xl p-6 hover:border-border transition-all group ${toneStyle.borderClass}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted/70 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            {scope && (
              <div className="mb-1">
                <SettingsScopePill scope={scope} />
              </div>
            )}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <RouterLink
          to={path}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/70 text-primary hover:bg-muted hover:text-primary/80 transition-colors"
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{ctaLabel || "Edit"}</span>
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
            <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="text-muted-foreground">•</span>
              {detail}
            </li>
          ))}
        </ul>
      )}

      {emptyGuidance && emptyGuidance.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground mb-4">
          {emptyGuidance.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}

      {lastUpdatedAt && (
        <div className="text-[11px] text-muted-foreground">
          Last updated {timeAgo(lastUpdatedAt)}
        </div>
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
      openaiModel: true,
      aiModelVersion: true,
      slaP0: true,
      slaP1: true,
      slaP2: true,
      slaP3: true,
      triageSchedule: true,
      notifyOnP0: true,
      notifyOnP1: true,
      notifyOnHighPriority: true,
      notifyOnNewConversation: true,
      notifyOnCustomerReply: true,
      notifyOnAutoSendFailure: true,
      dailyDigestEnabled: true,
      teamsWebhookUrl: true,
      notificationEmail: true,
      microsoftLastVerifiedAt: true,
    },
  });

  const [{ data: usersData }] = useFindMany(api.user, {
    select: { id: true },
  });

  const [{ data: conversationsData }] = useFindMany(api.conversation, {
    first: 500,
    select: {
      id: true,
      status: true,
      requiresHumanReview: true,
      hasDraft: true,
    } as any,
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
  const allConversations = (conversationsData as any[]) || [];
  const unresolvedQueueSize = allConversations.filter((conv) => !["resolved", "archived", "ignored"].includes(conv?.status)).length;
  const draftsPending = allConversations.filter((conv) => Boolean(conv?.requiresHumanReview) || Boolean(conv?.hasDraft)).length;
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
  const alertRulesCount = [
    config?.notifyOnP0,
    config?.notifyOnP1,
    config?.notifyOnHighPriority,
    config?.notifyOnNewConversation,
    config?.notifyOnCustomerReply,
    config?.notifyOnAutoSendFailure,
    config?.dailyDigestEnabled,
  ].filter(Boolean).length;
  const alertChannels = [
    config?.notificationEmail ? "email" : null,
    config?.teamsWebhookUrl ? "teams" : null,
  ].filter(Boolean) as string[];

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-background">

        <div className="border-b border-border bg-card/50 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your Office Wizard configuration</p>
            </div>
            <SettingsCloseButton className="h-9 w-9 text-muted-foreground hover:text-foreground" />
          </div>
        </div>

        <div className="p-8">
        <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">System status</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Live health snapshot of sync, queue, and draft workload
              </p>
            </div>
            <SettingsScopePill scope="global" />
            {msError && (
              <RouterLink to="/customer/support/settings/integrations" className="text-xs font-medium text-primary hover:text-primary/80">
                Fix Microsoft connection
              </RouterLink>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Microsoft connection</div>
              <div className={`mt-1 text-sm font-semibold ${msError ? "text-red-500" : "text-foreground"}`}>
                {msError ? "Failed" : config?.microsoftConnectionStatus === "connected" ? "OK" : "Disconnected"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Last sync</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{timeAgo(config?.lastSyncAt)}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Queue size</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{unresolvedQueueSize}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Drafts pending</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{draftsPending}</div>
            </div>
          </div>
        </div>

        {riskItems.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card/40 px-5 py-4">
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
                      <div className="text-sm text-foreground">{item.label}</div>
                      {item.detail && <div className="text-xs text-muted-foreground mt-0.5">{item.detail}</div>}
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
            path="/customer/support/settings/profile"
            healthTone="healthy"
            details={[
              user?.email || "No email",
              user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Name not set",
            ]}
            ctaLabel="Manage profile"
            scope="personal"
          />

          {/* Users */}
          <SettingsBlock
            icon={UsersIcon}
            title="Users"
            description="Team member management"
            path="/customer/support/settings/users"
            healthTone={usersTone}
            statusLabel={userCount > 0 ? "Healthy" : "Needs attention"}
            details={[
              `${userCount} ${userCount === 1 ? "user" : "users"}`,
              "Manage roles and permissions",
            ]}
            ctaLabel="Manage users"
            scope="global"
          />

          {/* Integrations */}
          <SettingsBlock
            icon={LinkIcon}
            title="Integrations"
            description="Connect external services"
            path="/customer/support/settings/integrations"
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
            ctaLabel="Manage connections"
            lastUpdatedAt={config?.lastSyncAt || config?.microsoftLastVerifiedAt}
            emptyGuidance={
              config?.connectedMailbox
                ? undefined
                : ["Connect a Microsoft mailbox", "Run a manual sync to verify access"]
            }
            scope="global"
          />

          {/* Triage & Workflow */}
          <SettingsBlock
            icon={Layers}
            title="Triage & Workflow"
            description="Email classification and routing"
            path="/customer/support/settings/triage"
            healthTone={triageTone}
            statusLabel={config?.autoTriageEnabled ? (triageStale ? "Stale" : "Healthy") : "Disabled"}
            details={
              config?.autoTriageEnabled
                ? [
                    `Last triage: ${timeAgo(lastTriagedAt)}`,
                    triageStale ? "Triage overdue (12h threshold)" : "Triage running on schedule",
                    `SLA targets: P0 ${config?.slaP0 || "—"}, P1 ${config?.slaP1 || "—"}, P2 ${config?.slaP2 || "—"}, P3 ${config?.slaP3 || "—"}`,
                  ]
                : ["Auto-triage disabled", "Enable triage to prioritise conversations"]
            }
            ctaLabel="Configure triage rules"
            lastUpdatedAt={lastTriagedAt}
            emptyGuidance={config?.autoTriageEnabled ? undefined : ["Enable auto-triage", "Set SLA targets and triage schedule"]}
            scope="override"
          />

          {/* AI & Automation */}
          <SettingsBlock
            icon={Sparkles}
            title="AI & Automation"
            description="AI models and auto-responses"
            path="/customer/support/settings/ai"
            healthTone={aiTone}
            statusLabel={config?.autoSendGlobalEnabled ? "Healthy" : "Disabled"}
            details={
              config?.autoSendGlobalEnabled
                ? [
                    `AI last invoked: ${timeAgo(lastAiAt)}`,
                    `Model: ${config?.openaiModel || config?.aiModelVersion || "Default"}`,
                    "Auto-draft enabled",
                    "AI classification active",
                  ]
                : ["AI automation disabled", "Enable AI for classification and drafts"]
            }
            ctaLabel="Configure AI"
            lastUpdatedAt={lastAiAt}
            emptyGuidance={config?.autoSendGlobalEnabled ? undefined : ["Enable AI automation", "Select a model and confidence threshold"]}
            scope="override"
          />

          {/* Playbooks & Batching */}
          <SettingsBlock
            icon={FileText}
            title="Playbooks & Batching"
            description="Response playbooks and batch operations"
            path="/customer/support/settings/templates"
            healthTone={templatesTone}
            statusLabel={hasTemplates ? "Healthy" : "Needs attention"}
            details={
              hasTemplates
                ? [`Last modified: ${timeAgo(lastTemplateAt)}`, "Playbooks configured"]
                : ["No playbooks created yet", "Add playbooks to speed up responses"]
            }
            ctaLabel="Manage playbooks"
            lastUpdatedAt={lastTemplateAt}
            emptyGuidance={hasTemplates ? undefined : ["Create at least one response playbook", "Add signatures for consistency"]}
            scope="module"
          />

          {/* Alerts & Notifications */}
          <SettingsBlock
            icon={Bell}
            title="Alerts & Notifications"
            description="Email and desktop alerts"
            path="/customer/support/settings/alerts"
            healthTone={alertsTone}
            statusLabel={config?.emailNotificationsEnabled ? "Healthy" : "Warning"}
            details={
              config?.emailNotificationsEnabled
                ? [
                    `Alert rules enabled: ${alertRulesCount}`,
                    `Channels: ${alertChannels.length ? alertChannels.join(", ") : "none configured"}`,
                    `Last alert: ${timeAgo(lastAlertAt)}`,
                  ]
                : ["Alerts disabled", "Enable notifications to receive escalations"]
            }
            ctaLabel="Configure alerts"
            lastUpdatedAt={lastAlertAt}
            emptyGuidance={
              config?.emailNotificationsEnabled
                ? undefined
                : ["Enable notifications", "Choose at least one alert channel"]
            }
            scope="global"
          />

          {/* Security & Compliance */}
          <SettingsBlock
            icon={Shield}
            title="Security & Compliance"
            description="Security settings and audit logs"
            path="/customer/support/settings/security"
            healthTone="healthy"
            details={["Configure security policies", "Review audit logs", "Manage access controls"]}
            ctaLabel="Review security"
            scope="global"
          />

          {/* Advanced */}
          <SettingsBlock
            icon={SettingsIcon}
            title="Advanced"
            description="Advanced configuration options"
            path="/customer/support/settings/advanced"
            healthTone="healthy"
            details={["Developer settings", "System configuration", "Debug options"]}
            ctaLabel="Open advanced settings"
            scope="admin"
          />
        </div>
        </div>
      </div>
    </div>
  );
}