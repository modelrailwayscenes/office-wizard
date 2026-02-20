import { useState, useEffect } from "react";
import { useFindFirst, useGlobalAction, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { UnifiedBadge } from "@/components/UnifiedBadge";
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
  { id: "summary", label: "Summary", icon: User2, path: "/settings/summary" },
  { id: "profile", label: "Profile", icon: User2, path: "/settings/profile" },
  { id: "users", label: "Users", icon: Users, path: "/settings/users" },
  { id: "triage", label: "Triage & Workflow", icon: Layers, path: "/settings/triage" },
  { id: "ai", label: "AI & Automation", icon: Sparkles, path: "/settings/ai" },
  { id: "templates", label: "Templates & Batching", icon: FileText, path: "/settings/templates" },
  { id: "security", label: "Security & Compliance", icon: Shield, path: "/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations", icon: LinkIcon, path: "/settings/integrations" },
  { id: "alerts", label: "Alerts & Notifications", icon: Bell, path: "/settings/alerts" },
  { id: "advanced", label: "Advanced", icon: Settings, path: "/settings/advanced" },
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
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.path;
          return (
            <RouterLink
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-teal-600/10 text-teal-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{tab.label}</span>
            </RouterLink>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-700" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin only</p>
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
                      ? "bg-teal-600/10 text-teal-400 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
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
        className={`pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
    setShopifyDomain(config.shopifyStoreDomain || "");
    setShopifyToken(config.shopifyAccessToken ? "••••••••••••••••" : "");
    setMondayToken(config.mondayApiToken ? "••••••••••••••••" : "");
  }, [config]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const msConnected = config?.microsoftConnectionStatus === "connected" && !!config?.microsoftAccessToken;
  const shopifyConnected = config?.shopifyConnectionStatus === "connected";
  const mondayConnected = config?.mondayConnectionStatus === "connected";

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
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8 text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} />
        <div className="flex-1 p-8 text-red-400">Error loading configuration: {error.toString()}</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-slate-950">
        {/* Header band */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <h1 className="text-2xl font-semibold text-white">Integrations</h1>
          <p className="text-sm text-slate-400 mt-1">Connect your email and third-party services</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4">

          {/* ═══════════════════════════════════════════════════════════════════
              Microsoft 365
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                msConnected
                  ? "bg-teal-500/15 border border-teal-500/30"
                  : "bg-slate-700/60 border border-slate-600"
              }`}>
                <Inbox className={`w-6 h-6 ${msConnected ? "text-teal-400" : "text-slate-400"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-white">Microsoft 365</h3>
                  <UnifiedBadge
                    type={config?.microsoftConnectionStatus || "disconnected"}
                    label={getStatusLabel(config?.microsoftConnectionStatus)}
                  />
                </div>

                {msConnected ? (
                  <>
                    <p className="text-slate-400 mb-3 text-sm">{config?.connectedMailbox}</p>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last verified {getTimeAgo(config?.microsoftLastVerifiedAt)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">
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
                      className="border-slate-700 hover:bg-slate-800"
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
                    className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
                  >
                    {connectingFetching ? "Connecting..." : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              Shopify
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                shopifyConnected
                  ? "bg-teal-500/15 border border-teal-500/30"
                  : "bg-slate-700/60 border border-slate-600"
              }`}>
                <ShoppingBag className={`w-6 h-6 ${shopifyConnected ? "text-teal-400" : "text-slate-400"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-white">Shopify</h3>
                  <UnifiedBadge
                    type={config?.shopifyConnectionStatus || "disconnected"}
                    label={getStatusLabel(config?.shopifyConnectionStatus)}
                  />
                </div>
                <p className="text-slate-400 text-sm">
                  {shopifyConnected
                    ? `Connected to ${config?.shopifyStoreDomain || "store"}`
                    : "Connect your Shopify store to sync orders, customers, and fulfilment data."}
                </p>
                {shopifyConnected && config?.shopifyLastVerifiedAt && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
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
                    className="border-slate-700 hover:bg-slate-800"
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
            <div className="border-t border-slate-700 pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-1.5 block">Store Domain</Label>
                  <Input
                    value={shopifyDomain}
                    onChange={(e) => { setShopifyDomain(e.target.value); setShopifyDirty(true); }}
                    placeholder="your-store.myshopify.com"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">e.g. my-shop.myshopify.com</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-1.5 block">Admin API Access Token</Label>
                  <SecretInput
                    value={shopifyToken}
                    onChange={(v) => { setShopifyToken(v); setShopifyDirty(true); }}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-slate-500 mt-1">From Shopify Admin → Settings → Apps → Develop apps</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleShopifySave}
                  disabled={!shopifyDirty || updatingConfig}
                  className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatingConfig ? "Saving..." : "Save Credentials"}
                </Button>
                {!shopifyConnected && shopifyDomain && shopifyToken && !shopifyDirty && (
                  <Button
                    onClick={handleShopifyVerify}
                    disabled={verifyingShopify}
                    variant="outline"
                    className="border-slate-700 hover:bg-slate-800"
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                mondayConnected
                  ? "bg-teal-500/15 border border-teal-500/30"
                  : "bg-slate-700/60 border border-slate-600"
              }`}>
                <CalendarCheck className={`w-6 h-6 ${mondayConnected ? "text-teal-400" : "text-slate-400"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-white">monday.com</h3>
                  <UnifiedBadge
                    type={config?.mondayConnectionStatus || "disconnected"}
                    label={getStatusLabel(config?.mondayConnectionStatus)}
                  />
                </div>
                <p className="text-slate-400 text-sm">
                  {mondayConnected
                    ? "Connected — sync projects, tasks, and workflows"
                    : "Connect your monday.com workspace for unified project management."}
                </p>
                {mondayConnected && config?.mondayLastVerifiedAt && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
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
                    className="border-slate-700 hover:bg-slate-800"
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
            <div className="border-t border-slate-700 pt-5 space-y-4">
              <div className="max-w-md">
                <Label className="text-sm font-medium text-slate-300 mb-1.5 block">Personal API Token</Label>
                <SecretInput
                  value={mondayToken}
                  onChange={(v) => { setMondayToken(v); setMondayDirty(true); }}
                  placeholder="eyJhbGciOiJIUzI1NiJ9..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  From monday.com → Avatar → Developers → Personal API Token
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMondaySave}
                  disabled={!mondayDirty || updatingConfig}
                  className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatingConfig ? "Saving..." : "Save Credentials"}
                </Button>
                {!mondayConnected && mondayToken && !mondayDirty && (
                  <Button
                    onClick={handleMondayVerify}
                    disabled={verifyingMonday}
                    variant="outline"
                    className="border-slate-700 hover:bg-slate-800"
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 opacity-50 pointer-events-none">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-700/60 border border-slate-600">
                <MessageSquare className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-white">Slack Integration</h3>
                  <UnifiedBadge type="coming_soon" label="COMING SOON" />
                </div>
                <p className="text-slate-400 text-sm">Send notifications to Slack channels — coming soon.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed"
                >
                  Connect
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-900/50 px-8 py-6">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-slate-700 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}