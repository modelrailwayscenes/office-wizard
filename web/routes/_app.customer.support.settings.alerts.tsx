import { useState, useEffect, useMemo } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useFindFirst, useFindMany, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell, Mail, Monitor,
  User2, Users as UsersIcon, Link as LinkIcon,
  Layers, Sparkles, FileText, Shield, Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsButtonGroup } from "@/components/SettingsButtonGroup";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";
import { SettingsScopePill } from "@/components/settings/SettingsScopePill";

const tabs = [
  { id: "summary",      label: "Summary",               icon: User2,        path: "/customer/support/settings/summary" },
  { id: "profile",      label: "Profile",               icon: User2,        path: "/customer/support/settings/profile" },
  { id: "users",         label: "Users",                 icon: UsersIcon,    path: "/customer/support/settings/users" },
  { id: "triage",       label: "Triage & Workflow",     icon: Layers,       path: "/customer/support/settings/triage" },
  { id: "ai",           label: "AI & Automation",       icon: Sparkles,     path: "/customer/support/settings/ai" },
  { id: "templates",    label: "Playbooks & Batching",  icon: FileText,     path: "/customer/support/settings/templates" },
  { id: "security",     label: "Security & Compliance", icon: Shield,       path: "/customer/support/settings/security" },
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

function Section({ icon: Icon, title, description, children, faded = false }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  faded?: boolean;
}) {
  return (
    <div className={`bg-muted/50 border border-border rounded-xl overflow-hidden transition-colors ${faded ? "opacity-50 pointer-events-none" : "hover:border-border"}`}>
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex-1 pr-8">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center flex-shrink-0">{children}</div>
    </div>
  );
}

export default function AlertsSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSave = async () => {
    toast.success("All changes saved");
  };

  const [{ data: configData, fetching, error }] = useFindFirst(api.appConfiguration);
  const config = configData as any;
  const [{ fetching: updating }, updateConfig] = useAction(api.appConfiguration.update);
  const [{ data: alertLogs, fetching: alertFetching }] = useFindMany(api.actionLog, {
    first: 20,
    sort: { performedAt: "Descending" },
    filter: {
      action: { in: ["email_fetched", "escalated", "email_sent", "bulk_action"] },
    } as any,
    select: {
      id: true,
      action: true,
      actionDescription: true,
      performedAt: true,
      success: true,
      errorMessage: true,
      conversation: { id: true, subject: true },
    } as any,
  });
  const [{ data: escalationLogs, fetching: escalationFetching }] = useFindMany(api.actionLog, {
    first: 30,
    sort: { performedAt: "Descending" },
    filter: { action: { equals: "escalated" } } as any,
    select: {
      id: true,
      actionDescription: true,
      performedAt: true,
      success: true,
      performedBy: true,
      metadata: true,
      errorMessage: true,
      conversation: { id: true, subject: true },
    } as any,
  });

  const [settings, setSettings] = useState({
    notifyOnP0: true,
    notifyOnP1: false,
    notifyOnHighPriority: false,
    notifyOnNewConversation: false,
    notifyOnCustomerReply: false,
    notifyOnAutoSendFailure: false,
    emailNotificationsEnabled: false,
    dailyDigestEnabled: false,
    dailyDigestTime: "09:00",
    notificationEmail: "",
    teamsWebhookUrl: "",
  });

  useEffect(() => {
    if (!config) return;
    setSettings({
      notifyOnP0:                  config.notifyOnP0                  ?? true,
      notifyOnP1:                  config.notifyOnP1                  ?? false,
      notifyOnHighPriority:        config.notifyOnHighPriority        ?? false,
      notifyOnNewConversation:     config.notifyOnNewConversation     ?? false,
      notifyOnCustomerReply:       config.notifyOnCustomerReply       ?? false,
      notifyOnAutoSendFailure:     config.notifyOnAutoSendFailure     ?? false,
      emailNotificationsEnabled:   config.emailNotificationsEnabled   ?? false,
      dailyDigestEnabled:          config.dailyDigestEnabled          ?? false,
      dailyDigestTime:             config.dailyDigestTime             ?? "09:00",
      notificationEmail:           config.notificationEmail           ?? "",
      teamsWebhookUrl:             config.teamsWebhookUrl             ?? "",
    });
  }, [config]);
  const escalationSummary = useMemo(() => {
    const rows = (escalationLogs as any[] | undefined) || [];
    const now = Date.now();
    const last24h = rows.filter((r) => {
      const t = r?.performedAt ? new Date(r.performedAt).getTime() : 0;
      return t > 0 && now - t <= 24 * 60 * 60 * 1000;
    });
    const failed = last24h.filter((r) => r?.success === false).length;
    return { total24h: last24h.length, failed24h: failed };
  }, [escalationLogs]);

  const handleToggle = async (field: string, value: boolean) => {
    if (!config?.id) return;
    setSettings((prev) => ({ ...prev, [field]: value }));
    try {
      await (updateConfig as any)({ id: config.id, [field]: value });
      toast.success("Setting updated");
    } catch {
      toast.error("Failed to update setting");
      setSettings((prev) => ({ ...prev, [field]: !value }));
    }
  };

  const handleTimeChange = async (value: string) => {
    if (!config?.id) return;
    setSettings((prev) => ({ ...prev, dailyDigestTime: value }));
    try {
      await (updateConfig as any)({ id: config.id, dailyDigestTime: value });
      toast.success("Digest time updated");
    } catch {
      toast.error("Failed to update time");
    }
  };
  const handleEscalationFieldSave = async (field: "notificationEmail" | "teamsWebhookUrl", value: string) => {
    if (!config?.id) return;
    setSettings((prev) => ({ ...prev, [field]: value }));
    try {
      await (updateConfig as any)({ id: config.id, [field]: value });
      toast.success("Escalation channel updated");
    } catch {
      toast.error("Failed to update escalation channel");
    }
  };

  if (fetching) {
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-red-400">Error loading settings: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-background">
        {/* HEADER with buttons */}
        <div className="border-b border-border bg-card/50 px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Alerts & Notifications</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure when and how you get notified
              </p>
              <div className="mt-2">
                <SettingsScopePill scope="global" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SettingsButtonGroup
                onSave={handleSave}
                onCancel={handleCancel}
                saving={updating}
              />
              <SettingsCloseButton className="h-9 w-9 text-muted-foreground hover:text-foreground" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8">

        <div className="space-y-4">

          {/* Proactive Alerts */}
          <Section
            icon={Bell}
            title="Proactive Alerts"
            description="Get notified when high-priority issues require immediate attention"
          >
            <SettingRow label="P0 Priority Alerts" description="Critical issues requiring immediate attention">
              <Switch
                checked={settings.notifyOnP0}
                onCheckedChange={(v) => handleToggle("notifyOnP0", v)}
                disabled={updating}
              />
            </SettingRow>
            <SettingRow label="P1 Priority Alerts" description="High priority issues that need a quick response">
              <Switch
                checked={settings.notifyOnP1}
                onCheckedChange={(v) => handleToggle("notifyOnP1", v)}
                disabled={updating}
              />
            </SettingRow>
            <SettingRow label="High Priority Conversations" description="Alert when any conversation is marked as high priority">
              <Switch
                checked={settings.notifyOnHighPriority}
                onCheckedChange={(v) => handleToggle("notifyOnHighPriority", v)}
                disabled={updating}
              />
            </SettingRow>
            <SettingRow label="Auto-Send Failures" description="Get notified when automated responses fail to send">
              <Switch
                checked={settings.notifyOnAutoSendFailure}
                onCheckedChange={(v) => handleToggle("notifyOnAutoSendFailure", v)}
                disabled={updating}
              />
            </SettingRow>
          </Section>

          {/* Recent Alerts */}
          <Section
            icon={Bell}
            title="Recent Alerts"
            description="Latest alert events captured by the system"
          >
            {alertFetching ? (
              <div className="px-6 py-4 text-sm text-muted-foreground">Loading alerts...</div>
            ) : (alertLogs && alertLogs.length > 0) ? (
              <div className="divide-y divide-border">
                {alertLogs.map((log: any) => (
                  <div key={log.id} className="px-6 py-4 flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm font-medium text-foreground">{log.actionDescription}</div>
                      {log.conversation?.subject && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {log.conversation.subject}
                        </div>
                      )}
                      {log.errorMessage && (
                        <div className="text-xs text-red-400 mt-1">{log.errorMessage}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.performedAt ? new Date(log.performedAt).toLocaleString("en-GB") : "—"}
                      {log.success === false && (
                        <span className="ml-2 text-red-400">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-4 text-sm text-muted-foreground">No alerts yet.</div>
            )}
          </Section>

          <Section
            icon={Bell}
            title="Escalation Channels"
            description="Configure where high-severity escalations are delivered and monitor delivery history"
          >
            <SettingRow
              label="Escalation email recipient"
              description="Critical escalations can be sent to this address"
            >
              <Input
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => setSettings((prev) => ({ ...prev, notificationEmail: e.target.value }))}
                onBlur={(e) => handleEscalationFieldSave("notificationEmail", e.target.value)}
                className="w-[320px] bg-muted border-border text-foreground"
                placeholder="ops@example.com"
              />
            </SettingRow>
            <SettingRow
              label="Teams webhook URL"
              description="Optional channel for escalation payloads in Microsoft Teams"
            >
              <Input
                value={settings.teamsWebhookUrl}
                onChange={(e) => setSettings((prev) => ({ ...prev, teamsWebhookUrl: e.target.value }))}
                onBlur={(e) => handleEscalationFieldSave("teamsWebhookUrl", e.target.value)}
                className="w-[420px] bg-muted border-border text-foreground"
                placeholder="https://outlook.office.com/webhook/..."
              />
            </SettingRow>
            <div className="px-6 py-4 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                Escalations (24h): {escalationSummary.total24h} • Failed deliveries: {escalationSummary.failed24h}
              </div>
            </div>
          </Section>

          <Section
            icon={Bell}
            title="Escalation History"
            description="Recent escalations and channel delivery outcomes"
          >
            {escalationFetching ? (
              <div className="px-6 py-4 text-sm text-muted-foreground">Loading escalation history...</div>
            ) : (escalationLogs && escalationLogs.length > 0) ? (
              <div className="divide-y divide-border">
                {(escalationLogs as any[]).map((log: any) => (
                  <div key={log.id} className="px-6 py-4 flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm font-medium text-foreground">{log.actionDescription || "Escalation event"}</div>
                      {log.conversation?.subject && (
                        <div className="text-xs text-muted-foreground mt-0.5">{log.conversation.subject}</div>
                      )}
                      {log.errorMessage && (
                        <div className="text-xs text-red-400 mt-1">{log.errorMessage}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap text-right">
                      <div>{log.performedAt ? new Date(log.performedAt).toLocaleString("en-GB") : "—"}</div>
                      <div>
                        {log.success === false ? (
                          <span className="text-red-400">Failed</span>
                        ) : (
                          <span className="text-emerald-400">Delivered</span>
                        )}
                        {log.performedBy ? ` • ${log.performedBy}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-4 text-sm text-muted-foreground">No escalations logged yet.</div>
            )}
          </Section>

          {/* Email Notifications */}
          <Section
            icon={Mail}
            title="Email Notifications"
            description="Configure email alerts for various events"
          >
            <SettingRow label="Enable Email Notifications" description="Master switch for all email-based alerts">
              <Switch
                checked={settings.emailNotificationsEnabled}
                onCheckedChange={(v) => handleToggle("emailNotificationsEnabled", v)}
                disabled={updating}
              />
            </SettingRow>
            <SettingRow label="New Conversation Alerts" description="Get notified when new conversations arrive">
              <Switch
                checked={settings.notifyOnNewConversation}
                onCheckedChange={(v) => handleToggle("notifyOnNewConversation", v)}
                disabled={updating || !settings.emailNotificationsEnabled}
              />
            </SettingRow>
            <SettingRow label="Customer Reply Alerts" description="Get notified when customers reply to conversations">
              <Switch
                checked={settings.notifyOnCustomerReply}
                onCheckedChange={(v) => handleToggle("notifyOnCustomerReply", v)}
                disabled={updating || !settings.emailNotificationsEnabled}
              />
            </SettingRow>
            <SettingRow label="Daily Digest" description="Receive a daily summary of all activity">
              <Switch
                checked={settings.dailyDigestEnabled}
                onCheckedChange={(v) => handleToggle("dailyDigestEnabled", v)}
                disabled={updating || !settings.emailNotificationsEnabled}
              />
            </SettingRow>
            {settings.dailyDigestEnabled && settings.emailNotificationsEnabled && (
              <div className="flex items-center gap-4 px-6 py-4 border-t border-border/60">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Send digest at</Label>
                <Input
                  type="time"
                  value={settings.dailyDigestTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={updating}
                  className="max-w-[140px] bg-muted border-border text-foreground"
                />
              </div>
            )}
          </Section>

          {/* Browser Notifications */}
          <Section
            icon={Monitor}
            title="Browser Notifications"
            description="Get real-time desktop notifications in your browser"
          >
            <SettingRow
              label="Desktop Notifications"
              description="Enable browser push notifications for real-time alerts"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!("Notification" in window)) {
                    toast.error("Your browser does not support notifications");
                    return;
                  }
                  Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                      toast.success("Desktop notifications enabled");
                    } else {
                      toast.error("Notification permission denied");
                    }
                  });
                }}
                className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Enable
              </Button>
            </SettingRow>
          </Section>

        </div>
      </div>

      {/* FOOTER with buttons */}
      <div className="border-t border-border bg-card/50 px-8 py-6">
        <SettingsButtonGroup
          onSave={handleSave}
          onCancel={handleCancel}
          saving={updating}
        />
      </div>
    </div>
    </div>
  );
}
