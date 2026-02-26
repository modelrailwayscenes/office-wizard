import { useState, useEffect, useMemo } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { useFindFirst, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Globe, HardDrive, Zap, Code2,
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";
import { SettingsScopePill } from "@/components/settings/SettingsScopePill";
import { evaluateDraftEligibility } from "@/lib/draftEligibility";
        {/* UPDATEDC*/}
const tabs = [
  { id: "summary",      label: "Summary",               icon: User2,        path: "/customer/support/settings/summary" },
  { id: "profile",      label: "Profile",               icon: User2,        path: "/customer/support/settings/profile" },
  { id: "users",        label: "Users",                 icon: UsersIcon,    path: "/customer/support/settings/users" },
  { id: "triage",       label: "Triage & Workflow",     icon: Layers,       path: "/customer/support/settings/triage" },
  { id: "ai",           label: "AI & Automation",       icon: Sparkles,     path: "/customer/support/settings/ai" },
  { id: "templates",    label: "Playbooks & Batching",  icon: FileText,     path: "/customer/support/settings/templates" },
  { id: "security",     label: "Security & Compliance", icon: Shield,       path: "/customer/support/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations",          icon: LinkIcon,     path: "/customer/support/settings/integrations" },
  { id: "alerts",       label: "Alerts & Notifications",icon: Bell,         path: "/customer/support/settings/alerts" },
  { id: "advanced",     label: "Advanced Settings",     icon: SettingsIcon, path: "/customer/support/settings/advanced" },
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

        {isAdmin && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Advanced</p>
            </div>
            {adminTabs.map(({ id, label, icon: Icon, path }) => (
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
          </>
        )}
      </nav>
    </div>
  );
}

export { AdvancedSettings };
export default AdvancedSettings;

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-border transition-colors">
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

function AdvancedSettings() {
  const location = useLocation();
  const user = useUser(api, { select: { roleList: { key: true } } });

  // ── App-wide config ────────────────────────────────────────────────────────
  const [{ data: configData, fetching: configFetching, error: configError }] = useFindFirst(api.appConfiguration);
  const config = configData as any;
  const [{ fetching: updatingConfig }, updateConfig] = useAction(api.appConfiguration.update);

  // ── Localisation state ─────────────────────────────────────────────────────
  const [language, setLanguage]     = useState("en");
  const [timezone, setTimezone]     = useState("gmt");
  const [dateFormat, setDateFormat] = useState("dmy");
  const [currency, setCurrency]     = useState("gbp");
  const [hoursFrom, setHoursFrom]   = useState("09:00");
  const [hoursTo, setHoursTo]       = useState("17:00");

  // ── Backup state ───────────────────────────────────────────────────────────
  const [backupSchedule, setBackupSchedule]       = useState("daily");
  const [backupRetentionDays, setBackupRetentionDays] = useState("30");

  // ── Performance state ──────────────────────────────────────────────────────
  const [cacheDurationMinutes, setCacheDurationMinutes] = useState("15");
  const [realTimeUpdatesEnabled, setRealTimeUpdatesEnabled] = useState(true);
  const [lazyLoadImages, setLazyLoadImages]               = useState(true);
  const [prefetchLinks, setPrefetchLinks]                 = useState(true);

  // ── Developer state ────────────────────────────────────────────────────────
  const [apiRateLimitPerMinute, setApiRateLimitPerMinute] = useState("60");
  const [debugModeEnabled, setDebugModeEnabled]           = useState(false);
  const [telemetryBannersEnabled, setTelemetryBannersEnabled] = useState(true);
  const [ignoreLastSyncAt, setIgnoreLastSyncAt] = useState(false);
  const [sandboxPlaybookSelected, setSandboxPlaybookSelected] = useState(true);
  const [sandboxConfidence, setSandboxConfidence] = useState("0.72");
  const [sandboxVerifiedCustomer, setSandboxVerifiedCustomer] = useState(true);
  const [sandboxOrderCount, setSandboxOrderCount] = useState("1");
  const [sandboxRequiredDataJson, setSandboxRequiredDataJson] = useState('["orderId","customerName"]');
  const [sandboxVariablesJson, setSandboxVariablesJson] = useState('{"orderId":"MRS-12345","customerName":"Jane"}');

  // ── Seed from appConfiguration ─────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    setLanguage(config.language             ?? "en");
    setTimezone(config.timezone             ?? "gmt");
    setDateFormat(config.dateFormat         ?? "dmy");
    setCurrency(config.currency             ?? "gbp");
    setHoursFrom(config.businessHoursFrom   ?? "09:00");
    setHoursTo(config.businessHoursTo       ?? "17:00");
    setBackupSchedule(config.backupSchedule ?? "daily");
    if (config.backupRetentionDays)     setBackupRetentionDays(String(config.backupRetentionDays));
    if (config.cacheDurationMinutes)    setCacheDurationMinutes(String(config.cacheDurationMinutes));
    setRealTimeUpdatesEnabled(config.realTimeUpdatesEnabled ?? true);
    setLazyLoadImages(config.lazyLoadImages                 ?? true);
    setPrefetchLinks(config.prefetchLinks                   ?? true);
    if (config.apiRateLimitPerMinute)   setApiRateLimitPerMinute(String(config.apiRateLimitPerMinute));
    setDebugModeEnabled(config.debugModeEnabled             ?? false);
    setTelemetryBannersEnabled(config.telemetryBannersEnabled ?? true);
    setIgnoreLastSyncAt(config.ignoreLastSyncAt ?? false);
  }, [config]);

  // ── Save helpers ───────────────────────────────────────────────────────────
  const saveConfig = async (fields: Record<string, any>) => {
    if (!config?.id) return;
    try {
      await (updateConfig as any)({ id: config.id, ...fields });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleConfigToggle = (field: string, setter: (v: boolean) => void) => async (value: boolean) => {
    setter(value);
    await saveConfig({ [field]: value });
  };

  const handleBlur = (field: string, value: string, asNumber = false) => async () => {
    await saveConfig({ [field]: asNumber ? Number(value) : value });
  };
  const sandboxResult = useMemo(() => {
    const orderCount = Number(sandboxOrderCount || "0");
    const confidence = Number(sandboxConfidence || "0");
    const safeVariablesJson = (() => {
      try {
        const parsed = JSON.parse(sandboxVariablesJson || "{}");
        return JSON.stringify({ variables: parsed });
      } catch {
        return "{}";
      }
    })();
    return evaluateDraftEligibility({
      selectedPlaybookId: sandboxPlaybookSelected ? "sandbox_playbook" : null,
      selectedPlaybookConfidence: Number.isNaN(confidence) ? null : confidence,
      isVerifiedCustomer: sandboxVerifiedCustomer,
      shopifyOrderNumbers: Array.from({ length: Math.max(orderCount, 0) }).map((_, i) => `MRS-${12000 + i}`),
      primaryCustomerEmail: "sandbox@example.com",
      primaryCustomerName: "Sandbox Customer",
      selectedPlaybookRequiredDataJson: sandboxRequiredDataJson,
      playbookSelectionMetaJson: safeVariablesJson,
    });
  }, [
    sandboxPlaybookSelected,
    sandboxConfidence,
    sandboxVerifiedCustomer,
    sandboxOrderCount,
    sandboxRequiredDataJson,
    sandboxVariablesJson,
  ]);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (configFetching) {
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-red-400">Error loading settings: {configError.message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-background">

        <div className="border-b border-border bg-card/50 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Advanced</h1>
              <p className="text-sm text-muted-foreground mt-1">Localisation, backups, performance, and developer options</p>
              <div className="mt-2">
                <SettingsScopePill scope="admin" />
              </div>
            </div>
            <SettingsCloseButton className="h-9 w-9 text-muted-foreground hover:text-foreground" />
          </div>
        </div>

        <div className="p-8 space-y-4">

          {/* Localisation */}
          <Section icon={Globe} title="Localisation" description="Language, timezone, and regional settings">
            <SettingRow label="Language">
              <Select value={language} onValueChange={(v) => { setLanguage(v); saveConfig({ language: v }); }}>
                <SelectTrigger className="w-52 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="en" className="text-foreground hover:bg-muted">English</SelectItem>
                  <SelectItem value="es" className="text-foreground hover:bg-muted">Spanish</SelectItem>
                  <SelectItem value="fr" className="text-foreground hover:bg-muted">French</SelectItem>
                  <SelectItem value="de" className="text-foreground hover:bg-muted">German</SelectItem>
                  <SelectItem value="ja" className="text-foreground hover:bg-muted">Japanese</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Timezone">
              <Select value={timezone} onValueChange={(v) => { setTimezone(v); saveConfig({ timezone: v }); }}>
                <SelectTrigger className="w-52 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="gmt" className="text-foreground hover:bg-muted">London (GMT+0)</SelectItem>
                  <SelectItem value="utc" className="text-foreground hover:bg-muted">UTC (GMT+0)</SelectItem>
                  <SelectItem value="est" className="text-foreground hover:bg-muted">Eastern Time (GMT-5)</SelectItem>
                  <SelectItem value="pst" className="text-foreground hover:bg-muted">Pacific Time (GMT-8)</SelectItem>
                  <SelectItem value="cet" className="text-foreground hover:bg-muted">Central European (GMT+1)</SelectItem>
                  <SelectItem value="jst" className="text-foreground hover:bg-muted">Japan Standard (GMT+9)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Date Format">
              <Select value={dateFormat} onValueChange={(v) => { setDateFormat(v); saveConfig({ dateFormat: v }); }}>
                <SelectTrigger className="w-52 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="dmy" className="text-foreground hover:bg-muted">DD/MM/YYYY</SelectItem>
                  <SelectItem value="mdy" className="text-foreground hover:bg-muted">MM/DD/YYYY</SelectItem>
                  <SelectItem value="ymd" className="text-foreground hover:bg-muted">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Currency">
              <Select value={currency} onValueChange={(v) => { setCurrency(v); saveConfig({ currency: v }); }}>
                <SelectTrigger className="w-52 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="gbp" className="text-foreground hover:bg-muted">GBP (&pound;)</SelectItem>
                  <SelectItem value="usd" className="text-foreground hover:bg-muted">USD ($)</SelectItem>
                  <SelectItem value="eur" className="text-foreground hover:bg-muted">EUR (&euro;)</SelectItem>
                  <SelectItem value="jpy" className="text-foreground hover:bg-muted">JPY (&yen;)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Business Hours" description="Used for SLA calculations and auto-send scheduling">
              <div className="flex items-center gap-2">
                <Input type="time" value={hoursFrom}
                  onChange={(e) => setHoursFrom(e.target.value)}
                  onBlur={handleBlur("businessHoursFrom", hoursFrom)}
                  className="w-32 bg-muted border-border text-foreground" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="time" value={hoursTo}
                  onChange={(e) => setHoursTo(e.target.value)}
                  onBlur={handleBlur("businessHoursTo", hoursTo)}
                  className="w-32 bg-muted border-border text-foreground" />
              </div>
            </SettingRow>
          </Section>

          {/* Backup & Recovery */}
          <Section icon={HardDrive} title="Backup & Recovery" description="Manage data backups and recovery options">
            <SettingRow label="Backup Schedule">
              <Select value={backupSchedule} onValueChange={(v) => { setBackupSchedule(v); saveConfig({ backupSchedule: v }); }}>
                <SelectTrigger className="w-40 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="hourly"  className="text-foreground hover:bg-muted">Hourly</SelectItem>
                  <SelectItem value="daily"   className="text-foreground hover:bg-muted">Daily</SelectItem>
                  <SelectItem value="weekly"  className="text-foreground hover:bg-muted">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-foreground hover:bg-muted">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Retention Period" description="How many days backup copies are kept">
              <Input type="number" value={backupRetentionDays}
                onChange={(e) => setBackupRetentionDays(e.target.value)}
                onBlur={handleBlur("backupRetentionDays", backupRetentionDays, true)}
                min={1} max={365}
                className="w-24 bg-muted border-border text-foreground text-center" />
            </SettingRow>
            <div className="px-6 py-4">
              <div className="bg-card/60 border border-border rounded-lg px-4 py-3 flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Last Backup</p>
                  <p className="text-sm text-muted-foreground mt-0.5">January 15, 2025 at 3:00 AM</p>
                  <p className="text-xs text-muted-foreground mt-1">Next: January 16, 2025 at 3:00 AM</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm text-primary font-medium">Success</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => toast.info("Download starting...")}
                  className="bg-primary hover:bg-primary/90 text-foreground">
                  Download Backup
                </Button>
                <Button variant="outline" onClick={() => toast.info("Restore coming soon")}
                  className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground">
                  Restore from Backup
                </Button>
                <Button variant="outline" onClick={() => toast.success("Backup started")}
                  className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground">
                  Backup Now
                </Button>
              </div>
            </div>
          </Section>

          {/* Performance */}
          <Section icon={Zap} title="Performance" description="Optimise application performance and loading behaviour">
            <SettingRow label="Cache Duration (minutes)" description="How long to cache data before refreshing from the server">
              <Input type="number" value={cacheDurationMinutes}
                onChange={(e) => setCacheDurationMinutes(e.target.value)}
                onBlur={handleBlur("cacheDurationMinutes", cacheDurationMinutes, true)}
                min={0} max={1440}
                className="w-24 bg-muted border-border text-foreground text-center" />
            </SettingRow>
            <SettingRow label="Real-time Updates" description="Enable live data synchronisation">
              <Switch checked={realTimeUpdatesEnabled}
                onCheckedChange={handleConfigToggle("realTimeUpdatesEnabled", setRealTimeUpdatesEnabled)}
                disabled={updatingConfig} />
            </SettingRow>
            <SettingRow label="Lazy Load Images" description="Load images only when they become visible">
              <Switch checked={lazyLoadImages}
                onCheckedChange={handleConfigToggle("lazyLoadImages", setLazyLoadImages)}
                disabled={updatingConfig} />
            </SettingRow>
            <SettingRow label="Prefetch Links" description="Preload page data on hover for faster navigation">
              <Switch checked={prefetchLinks}
                onCheckedChange={handleConfigToggle("prefetchLinks", setPrefetchLinks)}
                disabled={updatingConfig} />
            </SettingRow>
          </Section>


          {/* Developer Options */}
          <Section icon={Code2} title="Developer Options" description="Advanced options for API access and debugging">
            <SettingRow label="API Rate Limit (requests/minute)" description="Maximum number of API requests allowed per minute">
              <Input type="number" value={apiRateLimitPerMinute}
                onChange={(e) => setApiRateLimitPerMinute(e.target.value)}
                onBlur={handleBlur("apiRateLimitPerMinute", apiRateLimitPerMinute, true)}
                min={1} max={1000}
                className="w-24 bg-muted border-border text-foreground text-center" />
            </SettingRow>
            <SettingRow label="Debug Mode" description="Enable verbose logging and detailed error messages">
              <Switch checked={debugModeEnabled}
                onCheckedChange={handleConfigToggle("debugModeEnabled", setDebugModeEnabled)}
                disabled={updatingConfig} />
            </SettingRow>
            <SettingRow
              label="Telemetry Banners (temporary)"
              description="Show last action banners on Triage, Conversations, and Threads"
            >
              <Switch
                checked={telemetryBannersEnabled}
                onCheckedChange={handleConfigToggle("telemetryBannersEnabled", setTelemetryBannersEnabled)}
                disabled={updatingConfig}
              />
            </SettingRow>
            <SettingRow
              label="Full sync (ignore last sync)"
              description="Fetch all unread emails regardless of last sync timestamp"
            >
              <Switch
                checked={ignoreLastSyncAt}
                onCheckedChange={handleConfigToggle("ignoreLastSyncAt", setIgnoreLastSyncAt)}
                disabled={updatingConfig}
              />
            </SettingRow>
            <div className="px-6 py-4">
              <div className="bg-card/60 border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">API Documentation</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Comprehensive API reference and usage examples</p>
                </div>
                <Button variant="outline" onClick={() => toast.info("Opening docs...")}
                  className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground">
                  View Docs
                </Button>
              </div>
            </div>
          </Section>

          <Section
            icon={SettingsIcon}
            title="Governance Sandbox"
            description="Simulate draft policy outcomes without changing production records"
          >
            <SettingRow label="Playbook selected">
              <Switch checked={sandboxPlaybookSelected} onCheckedChange={setSandboxPlaybookSelected} />
            </SettingRow>
            <SettingRow label="Playbook confidence">
              <Input
                value={sandboxConfidence}
                onChange={(e) => setSandboxConfidence(e.target.value)}
                className="w-28 bg-muted border-border text-foreground text-center"
                type="number"
                step="0.01"
                min="0"
                max="1"
              />
            </SettingRow>
            <SettingRow label="Verified customer">
              <Switch checked={sandboxVerifiedCustomer} onCheckedChange={setSandboxVerifiedCustomer} />
            </SettingRow>
            <SettingRow label="Order count in context">
              <Input
                value={sandboxOrderCount}
                onChange={(e) => setSandboxOrderCount(e.target.value)}
                className="w-24 bg-muted border-border text-foreground text-center"
                type="number"
                min="0"
              />
            </SettingRow>
            <div className="px-6 py-4 space-y-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Required data JSON</Label>
                <Input
                  value={sandboxRequiredDataJson}
                  onChange={(e) => setSandboxRequiredDataJson(e.target.value)}
                  className="mt-1 bg-muted border-border text-foreground font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Selection variables JSON</Label>
                <Input
                  value={sandboxVariablesJson}
                  onChange={(e) => setSandboxVariablesJson(e.target.value)}
                  className="mt-1 bg-muted border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="rounded-lg border border-border bg-card/60 p-3">
                <div className="text-sm font-medium text-foreground">
                  Eligibility: {sandboxResult.eligible ? "PASS" : "BLOCKED"}
                </div>
                {sandboxResult.reasons.length > 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Reasons: {sandboxResult.reasons.join(" • ")}
                  </div>
                ) : null}
                {sandboxResult.hints.length > 0 ? (
                  <div className="mt-1 text-xs text-amber-500">
                    Hints: {sandboxResult.hints.join(" • ")}
                  </div>
                ) : null}
              </div>
            </div>
          </Section>

          <div className="pb-8" />

        </div>
      </div>
    </div>
  );
}
