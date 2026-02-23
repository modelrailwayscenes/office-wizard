import { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useFindFirst, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  FileText, Layers as BatchIcon, 
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsButtonGroup } from "@/components/SettingsButtonGroup";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/settings/profile" },
  { id: "users",         label: "Users",                  icon: UsersIcon,    path: "/settings/users" },
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

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
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

export default function TemplatesSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });

  const handleCancel = () => {
    navigate(-1);
  };


  const [{ data: configData, fetching, error }] = useFindFirst(api.appConfiguration);
  const config = configData as any;
  const [{ fetching: updating }, updateConfig] = useAction(api.appConfiguration.update);

  // Template state
  const [autoSendGlobalEnabled, setAutoSendGlobalEnabled]               = useState(false);
  const [autoSendOpeningHours, setAutoSendOpeningHours]                 = useState(false);
  const [autoSendProductInstructions, setAutoSendProductInstructions]   = useState(false);
  const [autoSendTrackingRequests, setAutoSendTrackingRequests]         = useState(false);
  const [autoSendGeneralFAQ, setAutoSendGeneralFAQ]                     = useState(false);
  const [autoSendConfidenceThreshold, setAutoSendConfidenceThreshold]   = useState(0.85);
  const [autoSendMaxPerDay, setAutoSendMaxPerDay]                       = useState("50");

  // Batch state
  const [bulkActionsEnabled, setBulkActionsEnabled]                     = useState(true);
  const [scheduledActionsEnabled, setScheduledActionsEnabled]           = useState(false);
  const [batchSize, setBatchSize]                                       = useState("50");
  const [maxEmailsPerTriage, setMaxEmailsPerTriage]                     = useState("500");

  // Seed from DB
  useEffect(() => {
    if (!config) return;
    setAutoSendGlobalEnabled(config.autoSendGlobalEnabled             ?? false);
    setAutoSendOpeningHours(config.autoSendOpeningHours               ?? false);
    setAutoSendProductInstructions(config.autoSendProductInstructions ?? false);
    setAutoSendTrackingRequests(config.autoSendTrackingRequests       ?? false);
    setAutoSendGeneralFAQ(config.autoSendGeneralFAQ                   ?? false);
    setAutoSendConfidenceThreshold(config.autoSendConfidenceThreshold ?? 0.85);
    if (config.autoSendMaxPerDay)   setAutoSendMaxPerDay(String(config.autoSendMaxPerDay));
    setBulkActionsEnabled(config.bulkActionsEnabled                   ?? true);
    setScheduledActionsEnabled(config.scheduledActionsEnabled         ?? false);
    if (config.batchSize)           setBatchSize(String(config.batchSize));
    if (config.maxEmailsPerTriage)  setMaxEmailsPerTriage(String(config.maxEmailsPerTriage));
  }, [config]);

  const handleSave = async () => {
    if (!config?.id) { toast.error("Configuration not found"); return; }
    try {
      await (updateConfig as any)({
        id: config.id,
        autoSendGlobalEnabled,
        autoSendOpeningHours,
        autoSendProductInstructions,
        autoSendTrackingRequests,
        autoSendGeneralFAQ,
        autoSendConfidenceThreshold,
        autoSendMaxPerDay:    Number(autoSendMaxPerDay),
        bulkActionsEnabled,
        scheduledActionsEnabled,
        batchSize:            Number(batchSize),
        maxEmailsPerTriage:   Number(maxEmailsPerTriage),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Templates & Batching</h1>
              <p className="text-sm text-slate-400 mt-1">
                Configure automatic responses and batch processing
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SettingsButtonGroup
                onSave={handleSave}
                onCancel={handleCancel}
                saving={updating || fetching}
              />
              <SettingsCloseButton className="h-9 w-9 text-slate-300 hover:text-white" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8">

        <div className="space-y-4">

          {/* Template Settings */}
          <Section
            icon={FileText}
            title="Template Settings"
            description="Configure automatic template usage and response generation"
          >
            <SettingRow
              label="Enable Auto-Send"
              description="Master switch — globally enable automatic email sending based on templates"
            >
              <Switch
                checked={autoSendGlobalEnabled}
                onCheckedChange={setAutoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Respect Opening Hours"
              description="Only auto-send during the business hours configured in Advanced settings"
            >
              <Switch
                checked={autoSendOpeningHours}
                onCheckedChange={setAutoSendOpeningHours}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Auto-Send Product Instructions"
              description="Automatically send product help and instruction templates"
            >
              <Switch
                checked={autoSendProductInstructions}
                onCheckedChange={setAutoSendProductInstructions}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Auto-Send Tracking Requests"
              description="Automatically respond to order tracking enquiries"
            >
              <Switch
                checked={autoSendTrackingRequests}
                onCheckedChange={setAutoSendTrackingRequests}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Auto-Send General FAQ"
              description="Automatically respond to common questions with FAQ templates"
            >
              <Switch
                checked={autoSendGeneralFAQ}
                onCheckedChange={setAutoSendGeneralFAQ}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            {/* Confidence threshold — full-width row */}
            <div className="px-6 py-4">
              <Label className="text-sm font-medium text-white">Confidence Threshold</Label>
              <p className="text-sm text-slate-400 mt-0.5 mb-4">
                Minimum AI confidence score required before an email is auto-sent
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  value={[autoSendConfidenceThreshold * 100]}
                  onValueChange={(v) => setAutoSendConfidenceThreshold(v[0] / 100)}
                  min={0} max={100} step={1}
                  disabled={!autoSendGlobalEnabled}
                  className="flex-1"
                />
                <span className="w-12 text-sm font-semibold text-white text-right">
                  {Math.round(autoSendConfidenceThreshold * 100)}%
                </span>
              </div>
            </div>

            <SettingRow
              label="Maximum Auto-Sends Per Day"
              description="Daily limit for automatically sent emails (0 = unlimited)"
            >
              <Input
                type="number"
                min={0}
                value={autoSendMaxPerDay}
                onChange={(e) => setAutoSendMaxPerDay(e.target.value)}
                disabled={!autoSendGlobalEnabled}
                className="w-24 bg-slate-800 border-slate-700 text-white text-center"
              />
            </SettingRow>
          </Section>

          {/* Batch Operations */}
          <Section
            icon={BatchIcon}
            title="Batch Operations"
            description="Configure batch processing and bulk action settings"
          >
            <SettingRow
              label="Enable Bulk Actions"
              description="Allow batch operations on multiple emails at once"
            >
              <Switch
                checked={bulkActionsEnabled}
                onCheckedChange={setBulkActionsEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Enable Scheduled Actions"
              description="Allow scheduling batch operations for future execution"
            >
              <Switch
                checked={scheduledActionsEnabled}
                onCheckedChange={setScheduledActionsEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Batch Processing Size"
              description="Number of emails to process in each batch operation (1–1000)"
            >
              <Input
                type="number"
                min={1} max={1000}
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-24 bg-slate-800 border-slate-700 text-white text-center"
              />
            </SettingRow>

            <SettingRow
              label="Maximum Emails Per Triage"
              description="Maximum number of emails to process in a single triage session (1–1000)"
            >
              <Input
                type="number"
                min={1} max={1000}
                value={maxEmailsPerTriage}
                onChange={(e) => setMaxEmailsPerTriage(e.target.value)}
                className="w-24 bg-slate-800 border-slate-700 text-white text-center"
              />
            </SettingRow>
          </Section>
          </div>
        </div>

        {/* FOOTER with buttons */}
        <div className="border-t border-slate-800 bg-slate-900/50 px-8 py-6">
          <SettingsButtonGroup
            onSave={handleSave}
            onCancel={handleCancel}
            saving={updating || fetching}
          />
        </div>
      </div>
    </div>
  );
}
