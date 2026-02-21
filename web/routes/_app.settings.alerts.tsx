import { useState, useEffect } from "react";
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

const tabs = [
  { id: "summary",      label: "Summary",               icon: User2,        path: "/settings/summary" },
  { id: "profile",      label: "Profile",               icon: User2,        path: "/settings/profile" },
  { id: "users",         label: "Users",                 icon: UsersIcon,    path: "/settings/users" },
  { id: "triage",       label: "Triage & Workflow",     icon: Layers,       path: "/settings/triage" },
  { id: "ai",           label: "AI & Automation",       icon: Sparkles,     path: "/settings/ai" },
  { id: "templates",    label: "Templates & Batching",  icon: FileText,     path: "/settings/templates" },
  { id: "security",     label: "Security & Compliance", icon: Shield,       path: "/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations",          icon: LinkIcon,     path: "/settings/integrations" },
  { id: "alerts",       label: "Alerts & Notifications",icon: Bell,         path: "/settings/alerts" },
  { id: "advanced",     label: "Advanced Settings",     icon: SettingsIcon, path: "/settings/advanced" },
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

function Section({ icon: Icon, title, description, children, faded = false }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  faded?: boolean;
}) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden transition-colors ${faded ? "opacity-50 pointer-events-none" : "hover:border-slate-600"}`}>
      <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-700/60">{children}</div>
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
        <Label className="text-sm font-medium text-white">{label}</Label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
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
    });
  }, [config]);

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

  if (fetching) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-red-400">Error loading settings: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-slate-950">
        {/* HEADER with buttons */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Alerts & Notifications</h1>
              <p className="text-sm text-slate-400 mt-1">
                Configure when and how you get notified
              </p>
            </div>
            <SettingsButtonGroup
              onSave={handleSave}
              onCancel={handleCancel}
              saving={updating}
            />
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
              <div className="px-6 py-4 text-sm text-slate-400">Loading alerts...</div>
            ) : (alertLogs && alertLogs.length > 0) ? (
              <div className="divide-y divide-slate-700/60">
                {alertLogs.map((log: any) => (
                  <div key={log.id} className="px-6 py-4 flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm font-medium text-white">{log.actionDescription}</div>
                      {log.conversation?.subject && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {log.conversation.subject}
                        </div>
                      )}
                      {log.errorMessage && (
                        <div className="text-xs text-red-400 mt-1">{log.errorMessage}</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {log.performedAt ? new Date(log.performedAt).toLocaleString("en-GB") : "—"}
                      {log.success === false && (
                        <span className="ml-2 text-red-400">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-4 text-sm text-slate-400">No alerts yet.</div>
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
              <div className="flex items-center gap-4 px-6 py-4 border-t border-slate-700/60">
                <Label className="text-sm text-slate-400 whitespace-nowrap">Send digest at</Label>
                <Input
                  type="time"
                  value={settings.dailyDigestTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={updating}
                  className="max-w-[140px] bg-slate-800 border-slate-700 text-white"
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
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Enable
              </Button>
            </SettingRow>
          </Section>

        </div>
      </div>

      {/* FOOTER with buttons */}
      <div className="border-t border-slate-800 bg-slate-900/50 px-8 py-6">
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
