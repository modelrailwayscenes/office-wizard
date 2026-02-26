import { useState, useEffect, useMemo } from "react";
import { useFindFirst, useFindMany, useGlobalAction, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";
import { SettingsScopePill } from "@/components/settings/SettingsScopePill";
import {
  User2,
  Users,
  Link as LinkIcon,
  Layers,
  Sparkles,
  FileText,
  Bell,
  Shield,
  Settings,
  Inbox,
  ShoppingBag,
  CalendarCheck,
  RefreshCw,
  Unplug,
  Clock,
  ArrowLeft,
  MessageSquare,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

// ── Sidebar ──────────────────────────────────────────────────────────────────
const tabs = [
  { id: "summary", label: "Summary", icon: User2, path: "/customer/support/settings/summary" },
  { id: "profile", label: "Profile", icon: User2, path: "/customer/support/settings/profile" },
  { id: "users", label: "Users", icon: Users, path: "/customer/support/settings/users" },
  { id: "triage", label: "Triage & Workflow", icon: Layers, path: "/customer/support/settings/triage" },
  { id: "ai", label: "AI & Automation", icon: Sparkles, path: "/customer/support/settings/ai" },
  { id: "templates", label: "Playbooks & Batching", icon: FileText, path: "/customer/support/settings/templates" },
  { id: "security", label: "Security & Compliance", icon: Shield, path: "/customer/support/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations", icon: LinkIcon, path: "/customer/support/settings/integrations" },
  { id: "alerts", label: "Alerts & Notifications", icon: Bell, path: "/customer/support/settings/alerts" },
  { id: "advanced", label: "Advanced Settings", icon: Settings, path: "/customer/support/settings/advanced" },
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
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.path;
          return (
            <RouterLink
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{tab.label}</span>
            </RouterLink>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin only</p>
            </div>
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPath === tab.path;
              return (
                <RouterLink
                  key={tab.id}
                  to={tab.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{tab.label}</span>
                </RouterLink>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTimeAgo(date: string | null | undefined) {
  if (!date) return "Never";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "connected": return "CONNECTED";
    case "error": return "ERROR";
    default: return "NOT CONNECTED";
  }
}

// ── Masked Input Component ───────────────────────────────────────────────────
function SecretInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pr-10 bg-muted border-border text-foreground placeholder:text-muted-foreground ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function IntegrationsSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [{ data: configData, fetching, error }, refetch] = useFindFirst(api.appConfiguration, {
    select: {
      id: true,
      // Microsoft
      connectedMailbox: true,
      microsoftTenantId: true,
      microsoftClientId: true,
      microsoftClientSecret: true,
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiresAt: true,
      microsoftConnectionStatus: true,
      microsoftLastVerifiedAt: true,
      // Shopify
      shopifyStoreDomain: true,
      shopifyAccessToken: true,
      shopifyConnectionStatus: true,
      shopifyLastVerifiedAt: true,
      // monday.com
      mondayApiToken: true,
      mondayConnectionStatus: true,
      mondayLastVerifiedAt: true,
      updatedAt: true,
    },
  });
  const [{ data: integrationLogs }] = useFindMany(api.actionLog, {
    first: 120,
    sort: { performedAt: "Descending" },
    filter: {
      action: { in: ["email_fetched", "email_sent", "bulk_action", "escalated"] },
    } as any,
    select: {
      id: true,
      action: true,
      actionDescription: true,
      performedAt: true,
      success: true,
      errorMessage: true,
      performedBy: true,
    } as any,
  });

  const config = configData as any;
  const [{ fetching: updatingConfig }, updateConfig] = useAction(api.appConfiguration.update);

  // ── Microsoft 365 actions ──────────────────────────────────────────────────
  const [{ fetching: connectingFetching }, getAuthUrl] = useGlobalAction(api.getAuthUrl);
  const [{ fetching: disconnectingMs }, disconnectOutlook] = useGlobalAction(api.disconnectOutlook);
  const [{ fetching: verifyingMs }, verifyMicrosoftConnection] = useGlobalAction(api.verifyMicrosoftConnection);

  // ── Shopify actions ────────────────────────────────────────────────────────
  const [{ fetching: verifyingShopify }, verifyShopifyConnection] = useGlobalAction(api.verifyShopifyConnection);
  const [{ fetching: disconnectingShopify }, disconnectShopify] = useGlobalAction(api.disconnectShopify);

  // ── monday.com actions ─────────────────────────────────────────────────────
  const [{ fetching: verifyingMonday }, verifyMondayConnection] = useGlobalAction(api.verifyMondayConnection);
  const [{ fetching: disconnectingMonday }, disconnectMonday] = useGlobalAction(api.disconnectMonday);

  // ── Microsoft 365 form state ───────────────────────────────────────────────
  const [msTenantId, setMsTenantId] = useState("");
  const [msClientId, setMsClientId] = useState("");
  const [msClientSecret, setMsClientSecret] = useState("");
  const [msDirty, setMsDirty] = useState(false);

  // ── Shopify form state ─────────────────────────────────────────────────────
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [shopifyDirty, setShopifyDirty] = useState(false);

  // ── monday.com form state ──────────────────────────────────────────────────
  const [mondayToken, setMondayToken] = useState("");
  const [mondayDirty, setMondayDirty] = useState(false);

  // ── Seed form state from config ────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    setMsTenantId(config.microsoftTenantId || "");
    setMsClientId(config.microsoftClientId || "");
    setMsClientSecret(config.microsoftClientSecret ? "••••••••••••••••" : "");
    setShopifyDomain(config.shopifyStoreDomain || "");
    setShopifyToken(config.shopifyAccessToken ? "••••••••••••••••" : "");
    setMondayToken(config.mondayApiToken ? "••••••••••••••••" : "");
  }, [config]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const msConnected = config?.microsoftConnectionStatus === "connected" && !!config?.microsoftAccessToken;
  const shopifyConnected = config?.shopifyConnectionStatus === "connected";
  const mondayConnected = config?.mondayConnectionStatus === "connected";
  const observability = useMemo(() => {
    const rows = (integrationLogs as any[] | undefined) || [];
    const now = Date.now();
    const last24h = rows.filter((r) => {
      const t = r?.performedAt ? new Date(r.performedAt).getTime() : 0;
      return t > 0 && now - t <= 24 * 60 * 60 * 1000;
    });
    const failed24h = last24h.filter((r) => r?.success === false);
    const recentFailures = rows.filter((r) => r?.success === false).slice(0, 8);
    const tokenExpiryLabel = config?.microsoftTokenExpiresAt
      ? getTimeAgo(config.microsoftTokenExpiresAt)
      : "Unknown";
    return {
      total24h: last24h.length,
      failed24h: failed24h.length,
      recentFailures,
      tokenExpiryLabel,
    };
  }, [integrationLogs, config?.microsoftTokenExpiresAt]);

  // ── Microsoft 365 handlers ─────────────────────────────────────────────────
  const handleMsConnect = async () => {
    try {
      const result = await getAuthUrl();
      const authUrl = (result as any)?.authUrl ?? (result as any)?.data?.authUrl;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.error("Failed to get authorisation URL");
      }
    } catch {
      toast.error("Failed to connect to Microsoft 365");
    }
  };

  const handleMsDisconnect = async () => {
    try {
      await disconnectOutlook();
      await refetch({ requestPolicy: "network-only" });
      toast.success("Disconnected from Microsoft 365");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleMsVerify = async () => {
    try {
      const result = await verifyMicrosoftConnection();
      const data = (result as any)?.data ?? result;
      if (data?.connected) {
        await refetch({ requestPolicy: "network-only" });
        toast.success("Connection verified");
      } else {
        toast.error(data?.error || "Verification failed");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Verification failed");
    }
  };

  const handleMsSave = async () => {
    if (!config?.id) return;
    try {
      const fields: any = {
        microsoftTenantId: msTenantId.trim(),
        microsoftClientId: msClientId.trim(),
      };
      if (msClientSecret && !msClientSecret.startsWith("••")) {
        fields.microsoftClientSecret = msClientSecret.trim();
      }
      await (updateConfig as any)({ id: config.id, ...fields });
      setMsDirty(false);
      toast.success("Microsoft 365 credentials saved");
    } catch {
      toast.error("Failed to save credentials");
    }
  };

  // ── Shopify handlers ───────────────────────────────────────────────────────
  const handleShopifySave = async () => {
    if (!config?.id) return;
    try {
      const fields: any = { shopifyStoreDomain: shopifyDomain.trim() };
      // Only update token if user typed a new one (not the mask)
      if (shopifyToken && !shopifyToken.startsWith("••")) {
        fields.shopifyAccessToken = shopifyToken.trim();
      }
      await (updateConfig as any)({ id: config.id, ...fields });
      setShopifyDirty(false);
      toast.success("Shopify credentials saved");
    } catch {
      toast.error("Failed to save credentials");
    }
  };

  const handleShopifyVerify = async () => {
    try {
      const result = await verifyShopifyConnection();
      const data = (result as any)?.data ?? result;
      if (data?.connected) {
        await refetch({ requestPolicy: "network-only" });
        toast.success(`Connected to ${data.shopName || "Shopify"}`);
      } else {
        await refetch({ requestPolicy: "network-only" });
        toast.error(data?.error || "Verification failed");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Verification failed");
    }
  };

  const handleShopifyDisconnect = async () => {
    try {
      await disconnectShopify();
      setShopifyDomain("");
      setShopifyToken("");
      setShopifyDirty(false);
      await refetch({ requestPolicy: "network-only" });
      toast.success("Disconnected from Shopify");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // ── monday.com handlers ────────────────────────────────────────────────────
  const handleMondaySave = async () => {
    if (!config?.id) return;
    try {
      const fields: any = {};
      if (mondayToken && !mondayToken.startsWith("••")) {
        fields.mondayApiToken = mondayToken.trim();
      }
      await (updateConfig as any)({ id: config.id, ...fields });
      setMondayDirty(false);
      toast.success("monday.com credentials saved");
    } catch {
      toast.error("Failed to save credentials");
    }
  };

  const handleMondayVerify = async () => {
    try {
      const result = await verifyMondayConnection();
      const data = (result as any)?.data ?? result;
      if (data?.connected) {
        await refetch({ requestPolicy: "network-only" });
        toast.success(`Connected as ${data.userName || "user"} (${data.accountName || "account"})`);
      } else {
        await refetch({ requestPolicy: "network-only" });
        toast.error(data?.error || "Verification failed");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Verification failed");
    }
  };

  const handleMondayDisconnect = async () => {
    try {
      await disconnectMonday();
      setMondayToken("");
      setMondayDirty(false);
      await refetch({ requestPolicy: "network-only" });
      toast.success("Disconnected from monday.com");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
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
        <div className="flex-1 p-8 text-red-400">Error loading configuration: {error.toString()}</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-background">
        {/* Header band */}
        <div className="border-b border-border bg-card/50 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
              <p className="text-sm text-muted-foreground mt-1">Connect your email and third-party services</p>
              <div className="mt-2">
                <SettingsScopePill scope="global" />
              </div>
            </div>
            <SettingsCloseButton className="h-9 w-9 text-muted-foreground hover:text-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4">

          {/* ═══════════════════════════════════════════════════════════════════
              Microsoft 365
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-muted/50 border border-border rounded-xl p-6 hover:border-border transition-colors">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                msConnected
                  ? "bg-primary/15 border border-primary/30"
                  : "bg-muted/60 border border-border"
              }`}>
                <Inbox className={`w-6 h-6 ${msConnected ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-foreground">Microsoft 365</h3>
                  <UnifiedBadge
                    type={config?.microsoftConnectionStatus || "disconnected"}
                    label={getStatusLabel(config?.microsoftConnectionStatus)}
                  />
                </div>

                {msConnected ? (
                  <>
                    <p className="text-muted-foreground mb-3 text-sm">{config?.connectedMailbox}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last verified {getTimeAgo(config?.microsoftLastVerifiedAt)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Connect your Microsoft 365 account to enable email synchronisation and management.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {msConnected ? (
                  <>
                    <Button
                      onClick={handleMsVerify}
                      disabled={verifyingMs}
                      variant="outline"
                      className="border-border hover:bg-muted"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${verifyingMs ? "animate-spin" : ""}`} />
                      {verifyingMs ? "Verifying..." : "Verify"}
                    </Button>
                    <Button
                      onClick={handleMsDisconnect}
                      disabled={disconnectingMs}
                      variant="outline"
                      className="border-red-800/60 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700"
                    >
                      <Unplug className="h-4 w-4 mr-2" />
                      {disconnectingMs ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleMsConnect}
                    disabled={connectingFetching}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {connectingFetching ? "Connecting..." : "Connect"}
                  </Button>
                )}
              </div>
            </div>

            {/* Microsoft 365 config form */}
            <div className="border-t border-border pt-5 mt-6 space-y-4">
              <div className="grid gap-4 max-w-xl">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">Tenant ID</Label>
                  <Input
                    value={msTenantId}
                    onChange={(e) => { setMsTenantId(e.target.value); setMsDirty(true); }}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">Client ID</Label>
                  <Input
                    value={msClientId}
                    onChange={(e) => { setMsClientId(e.target.value); setMsDirty(true); }}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">Client Secret</Label>
                  <SecretInput
                    value={msClientSecret}
                    onChange={(v) => { setMsClientSecret(v); setMsDirty(true); }}
                    placeholder="••••••••••••••••"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Redirect URI: {typeof window !== "undefined" ? `${window.location.origin}/authorize` : "/authorize"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMsSave}
                  disabled={!msDirty || updatingConfig}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatingConfig ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              Shopify
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-muted/50 border border-border rounded-xl p-6 hover:border-border transition-colors">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                shopifyConnected
                  ? "bg-primary/15 border border-primary/30"
                  : "bg-muted/60 border border-border"
              }`}>
                <ShoppingBag className={`w-6 h-6 ${shopifyConnected ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-foreground">Shopify</h3>
                  <UnifiedBadge
                    type={config?.shopifyConnectionStatus || "disconnected"}
                    label={getStatusLabel(config?.shopifyConnectionStatus)}
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {shopifyConnected
                    ? `Connected to ${config?.shopifyStoreDomain || "store"}`
                    : "Connect your Shopify store to sync orders, customers, and fulfilment data."}
                </p>
                {shopifyConnected && config?.shopifyLastVerifiedAt && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last verified {getTimeAgo(config.shopifyLastVerifiedAt)}</span>
                  </div>
                )}
              </div>

              {shopifyConnected && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={handleShopifyVerify}
                    disabled={verifyingShopify}
                    variant="outline"
                    className="border-border hover:bg-muted"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${verifyingShopify ? "animate-spin" : ""}`} />
                    {verifyingShopify ? "Verifying..." : "Verify"}
                  </Button>
                  <Button
                    onClick={handleShopifyDisconnect}
                    disabled={disconnectingShopify}
                    variant="outline"
                    className="border-red-800/60 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700"
                  >
                    <Unplug className="h-4 w-4 mr-2" />
                    {disconnectingShopify ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              )}
            </div>

            {/* Shopify config form */}
            <div className="border-t border-border pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">Store Domain</Label>
                  <Input
                    value={shopifyDomain}
                    onChange={(e) => { setShopifyDomain(e.target.value); setShopifyDirty(true); }}
                    placeholder="your-store.myshopify.com"
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">e.g. my-shop.myshopify.com</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">Admin API Access Token</Label>
                  <SecretInput
                    value={shopifyToken}
                    onChange={(v) => { setShopifyToken(v); setShopifyDirty(true); }}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground mt-1">From Shopify Admin → Settings → Apps → Develop apps</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleShopifySave}
                  disabled={!shopifyDirty || updatingConfig}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatingConfig ? "Saving..." : "Save Credentials"}
                </Button>
                {!shopifyConnected && shopifyDomain && shopifyToken && !shopifyDirty && (
                  <Button
                    onClick={handleShopifyVerify}
                    disabled={verifyingShopify}
                    variant="outline"
                    className="border-border hover:bg-muted"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${verifyingShopify ? "animate-spin" : ""}`} />
                    {verifyingShopify ? "Verifying..." : "Test Connection"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              monday.com
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-muted/50 border border-border rounded-xl p-6 hover:border-border transition-colors">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                mondayConnected
                  ? "bg-primary/15 border border-primary/30"
                  : "bg-muted/60 border border-border"
              }`}>
                <CalendarCheck className={`w-6 h-6 ${mondayConnected ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-foreground">monday.com</h3>
                  <UnifiedBadge
                    type={config?.mondayConnectionStatus || "disconnected"}
                    label={getStatusLabel(config?.mondayConnectionStatus)}
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {mondayConnected
                    ? "Connected — sync projects, tasks, and workflows"
                    : "Connect your monday.com workspace for unified project management."}
                </p>
                {mondayConnected && config?.mondayLastVerifiedAt && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last verified {getTimeAgo(config.mondayLastVerifiedAt)}</span>
                  </div>
                )}
              </div>

              {mondayConnected && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={handleMondayVerify}
                    disabled={verifyingMonday}
                    variant="outline"
                    className="border-border hover:bg-muted"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${verifyingMonday ? "animate-spin" : ""}`} />
                    {verifyingMonday ? "Verifying..." : "Verify"}
                  </Button>
                  <Button
                    onClick={handleMondayDisconnect}
                    disabled={disconnectingMonday}
                    variant="outline"
                    className="border-red-800/60 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700"
                  >
                    <Unplug className="h-4 w-4 mr-2" />
                    {disconnectingMonday ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              )}
            </div>

            {/* monday.com config form */}
            <div className="border-t border-border pt-5 space-y-4">
              <div className="max-w-md">
                <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">Personal API Token</Label>
                <SecretInput
                  value={mondayToken}
                  onChange={(v) => { setMondayToken(v); setMondayDirty(true); }}
                  placeholder="eyJhbGciOiJIUzI1NiJ9..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  From monday.com → Avatar → Developers → Personal API Token
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMondaySave}
                  disabled={!mondayDirty || updatingConfig}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatingConfig ? "Saving..." : "Save Credentials"}
                </Button>
                {!mondayConnected && mondayToken && !mondayDirty && (
                  <Button
                    onClick={handleMondayVerify}
                    disabled={verifyingMonday}
                    variant="outline"
                    className="border-border hover:bg-muted"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${verifyingMonday ? "animate-spin" : ""}`} />
                    {verifyingMonday ? "Verifying..." : "Test Connection"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              Slack (coming soon)
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-muted/50 border border-border rounded-xl p-6 opacity-50 pointer-events-none">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-muted/60 border border-border">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-foreground">Slack Integration</h3>
                  <UnifiedBadge type="coming_soon" label="COMING SOON" />
                </div>
                <p className="text-muted-foreground text-sm">Send notifications to Slack channels — coming soon.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                >
                  Connect
                </Button>
              </div>
            </div>
          </div>

          {/* Observability */}
          <div className="bg-muted/50 border border-border rounded-xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Integration Observability</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connection health, recent failures, and token lifecycle visibility.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch({ requestPolicy: "network-only" })}
                className="border-border hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh metrics
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-xs text-muted-foreground">Events (24h)</div>
                <div className="text-xl font-semibold text-foreground mt-1">{observability.total24h}</div>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-xs text-muted-foreground">Failures (24h)</div>
                <div className="text-xl font-semibold text-red-400 mt-1">{observability.failed24h}</div>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-xs text-muted-foreground">Microsoft token expiry</div>
                <div className="text-xl font-semibold text-foreground mt-1">{observability.tokenExpiryLabel}</div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-card/40 p-3">
              <div className="text-xs text-muted-foreground mb-2">Recent integration failures</div>
              {observability.recentFailures.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent failures.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {observability.recentFailures.map((row: any) => (
                    <div key={row.id} className="rounded-md border border-border bg-muted/30 px-2 py-1.5">
                      <div className="text-[11px] text-foreground">
                        {row.actionDescription || row.action}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {row.errorMessage || "Unknown error"} • {getTimeAgo(row.performedAt)} • {row.performedBy || "system"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-border bg-card/50 px-8 py-6">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}