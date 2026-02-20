import { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useFindFirst, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, ShieldCheck, Lock, ClipboardList, Database,
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsButtonGroup } from "@/components/SettingsButtonGroup";

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
  { id: "advanced",     label: "Admin Only",               icon: SettingsIcon, path: "/settings/advanced" },
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

function SettingRow({ label, description, children, indent = false }: {
  label: string;
  description?: string;
  children: React.ReactNode;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 ${indent ? "pl-12 pr-6" : "px-6"}`}>
      <div className="flex-1 pr-8">
        <Label className={`text-sm font-medium ${indent ? "text-slate-300" : "text-white"}`}>{label}</Label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center flex-shrink-0">{children}</div>
    </div>
  );
}

function StatusRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-4 px-6 py-4">
      <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });

  const handleCancel = () => {
    navigate(-1);
  };


  const [{ data: configData, fetching, error }] = useFindFirst(api.appConfiguration);
  const config = configData as any;
  const [{ fetching: updating }, updateConfig] = useAction(api.appConfiguration.update);

  // Data Retention
  const [retentionDays, setRetentionDays] = useState("90");
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState("365");
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(true);
  const [deleteArchivedData, setDeleteArchivedData] = useState(false);
  // Access Control
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [redactAddresses, setRedactAddresses] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState("30");
  const [pwRequireMinLength, setPwRequireMinLength] = useState(true);
  const [pwRequireUppercase, setPwRequireUppercase] = useState(true);
  const [pwRequireNumbers, setPwRequireNumbers] = useState(true);
  const [pwRequireSpecial, setPwRequireSpecial] = useState(true);
  const [pwRequireExpiry, setPwRequireExpiry] = useState(false);
  // Audit Trail
  const [auditLogAuth, setAuditLogAuth] = useState(true);
  const [auditLogEmailAccess, setAuditLogEmailAccess] = useState(true);
  const [auditLogConfigChanges, setAuditLogConfigChanges] = useState(true);
  const [auditLogExports, setAuditLogExports] = useState(true);

  // Seed from DB
  useEffect(() => {
    if (!config) return;
    if (config.retentionDays)         setRetentionDays(String(config.retentionDays));
    if (config.auditLogRetentionDays) setAuditLogRetentionDays(String(config.auditLogRetentionDays));
    setAutoArchiveEnabled(config.autoArchiveEnabled   ?? true);
    setDeleteArchivedData(config.deleteArchivedData   ?? false);
    setIpWhitelist(config.ipWhitelist                 ?? "");
    setRedactAddresses(config.redactAddresses         ?? false);
    setRequire2FA(config.require2FA                   ?? false);
    if (config.sessionTimeoutMinutes) setSessionTimeoutMinutes(String(config.sessionTimeoutMinutes));
    setPwRequireMinLength(config.pwRequireMinLength   ?? true);
    setPwRequireUppercase(config.pwRequireUppercase   ?? true);
    setPwRequireNumbers(config.pwRequireNumbers       ?? true);
    setPwRequireSpecial(config.pwRequireSpecial       ?? true);
    setPwRequireExpiry(config.pwRequireExpiry         ?? false);
    setAuditLogAuth(config.auditLogAuth               ?? true);
    setAuditLogEmailAccess(config.auditLogEmailAccess ?? true);
    setAuditLogConfigChanges(config.auditLogConfigChanges ?? true);
    setAuditLogExports(config.auditLogExports         ?? true);
  }, [config]);

  // Instant save for toggles
  const handleToggle = (field: string, setter: (v: boolean) => void) => async (value: boolean) => {
    setter(value);
    if (!config?.id) return;
    try {
      await (updateConfig as any)({ id: config.id, [field]: value });
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
      setter(!value); // revert
    }
  };

  // Save on blur for text/number inputs
  const handleBlurSave = (field: string, value: string, asNumber = false) => async () => {
    if (!config?.id) return;
    try {
      await (updateConfig as any)({ id: config.id, [field]: asNumber ? Number(value) : value });
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    }
  };

  // Immediate save for selects (values stored as numbers in DB)
  const handleSelectSave = (field: string, setter: (v: string) => void) => async (value: string) => {
    setter(value);
    if (!config?.id) return;
    try {
      await (updateConfig as any)({ id: config.id, [field]: Number(value) });
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
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

        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <h1 className="text-2xl font-semibold text-white">Security & Compliance</h1>
          <p className="text-sm text-slate-400 mt-1">Data protection, access control, and audit settings</p>
        </div>

        <div className="p-8 space-y-4">

          {/* Data Retention */}
          <Section icon={Database} title="Data Retention" description="Configure how long data is stored in the system">
            <SettingRow label="Email Retention Period" description="How long emails are kept before becoming eligible for archiving">
              <Select value={retentionDays} onValueChange={handleSelectSave("retentionDays", setRetentionDays)}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="30"  className="text-white hover:bg-slate-700">30 days</SelectItem>
                  <SelectItem value="90"  className="text-white hover:bg-slate-700">90 days</SelectItem>
                  <SelectItem value="180" className="text-white hover:bg-slate-700">180 days</SelectItem>
                  <SelectItem value="365" className="text-white hover:bg-slate-700">1 year</SelectItem>
                  <SelectItem value="730" className="text-white hover:bg-slate-700">2 years</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Audit Log Retention Period" description="How long audit log entries are retained">
              <Select value={auditLogRetentionDays} onValueChange={handleSelectSave("auditLogRetentionDays", setAuditLogRetentionDays)}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="90"   className="text-white hover:bg-slate-700">90 days</SelectItem>
                  <SelectItem value="180"  className="text-white hover:bg-slate-700">180 days</SelectItem>
                  <SelectItem value="365"  className="text-white hover:bg-slate-700">1 year</SelectItem>
                  <SelectItem value="730"  className="text-white hover:bg-slate-700">2 years</SelectItem>
                  <SelectItem value="1095" className="text-white hover:bg-slate-700">3 years</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Auto-Archive Old Conversations" description="Automatically archive conversations after the retention period expires">
              <Switch checked={autoArchiveEnabled} onCheckedChange={handleToggle("autoArchiveEnabled", setAutoArchiveEnabled)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Delete Archived Data" description="Permanently delete archived data after an extended period">
              <Switch checked={deleteArchivedData} onCheckedChange={handleToggle("deleteArchivedData", setDeleteArchivedData)} disabled={updating} />
            </SettingRow>
          </Section>

          {/* Access Control */}
          <Section icon={Lock} title="Access Control" description="Manage user access and authentication requirements">
            <SettingRow label="IP Whitelist" description="Comma-separated list of allowed IP addresses or CIDR ranges">
              <Input
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                onBlur={handleBlurSave("ipWhitelist", ipWhitelist)}
                placeholder="e.g. 192.168.1.1, 10.0.0.0/24"
                className="w-64 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </SettingRow>
            <SettingRow label="Redact Email Addresses" description="Mask customer email addresses in logs and exports">
              <Switch checked={redactAddresses} onCheckedChange={handleToggle("redactAddresses", setRedactAddresses)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Require Two-Factor Authentication" description="Enforce 2FA for all user accounts">
              <Switch checked={require2FA} onCheckedChange={handleToggle("require2FA", setRequire2FA)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Session Timeout (minutes)" description="Automatic logout after a period of inactivity">
              <Input
                type="number"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
                onBlur={handleBlurSave("sessionTimeoutMinutes", sessionTimeoutMinutes, true)}
                min={5} max={1440}
                className="w-24 bg-slate-800 border-slate-700 text-white text-center"
              />
            </SettingRow>
            <div className="px-6 py-4">
              <Label className="text-sm font-medium text-white">Password Requirements</Label>
              <p className="text-sm text-slate-400 mt-0.5">Rules enforced when users set or update their password</p>
            </div>
            <SettingRow label="Minimum length (8 characters)" indent>
              <Switch checked={pwRequireMinLength} onCheckedChange={handleToggle("pwRequireMinLength", setPwRequireMinLength)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Require uppercase letters" indent>
              <Switch checked={pwRequireUppercase} onCheckedChange={handleToggle("pwRequireUppercase", setPwRequireUppercase)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Require numbers" indent>
              <Switch checked={pwRequireNumbers} onCheckedChange={handleToggle("pwRequireNumbers", setPwRequireNumbers)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Require special characters" indent>
              <Switch checked={pwRequireSpecial} onCheckedChange={handleToggle("pwRequireSpecial", setPwRequireSpecial)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Password expiry (90 days)" indent>
              <Switch checked={pwRequireExpiry} onCheckedChange={handleToggle("pwRequireExpiry", setPwRequireExpiry)} disabled={updating} />
            </SettingRow>
          </Section>

          {/* Audit Trail */}
          <Section icon={ClipboardList} title="Audit Trail" description="Configure which events are logged for compliance and monitoring">
            <SettingRow label="Log User Authentication" description="Track all login and logout events">
              <Switch checked={auditLogAuth} onCheckedChange={handleToggle("auditLogAuth", setAuditLogAuth)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Log Email Access" description="Track when emails are viewed or modified">
              <Switch checked={auditLogEmailAccess} onCheckedChange={handleToggle("auditLogEmailAccess", setAuditLogEmailAccess)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Log Configuration Changes" description="Track all system configuration modifications">
              <Switch checked={auditLogConfigChanges} onCheckedChange={handleToggle("auditLogConfigChanges", setAuditLogConfigChanges)} disabled={updating} />
            </SettingRow>
            <SettingRow label="Log Data Exports" description="Track when data is exported from the system">
              <Switch checked={auditLogExports} onCheckedChange={handleToggle("auditLogExports", setAuditLogExports)} disabled={updating} />
            </SettingRow>
            <div className="px-6 py-4">
              <Button
                variant="outline"
                onClick={() => toast.info("Audit log export coming soon")}
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Export Audit Logs
              </Button>
            </div>
          </Section>

          {/* Data Encryption — read-only */}
          <Section icon={ShieldCheck} title="Data Encryption" description="Encryption status managed by Gadget infrastructure">
            <StatusRow label="Data at Rest Encryption"    description="All stored data is encrypted using AES-256" />
            <StatusRow label="Data in Transit Encryption" description="All network traffic uses TLS 1.3" />
            <StatusRow label="Database Encryption"        description="Database connections use encrypted channels" />
            <StatusRow label="API Encryption"             description="All API endpoints require HTTPS" />
          </Section>

          <div className="pb-8" />

        </div>
      </div>
    </div>
  );
}
