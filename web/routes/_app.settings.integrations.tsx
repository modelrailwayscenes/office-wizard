import { useState } from "react";
import { useFindFirst, useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
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
  RefreshCw,
  Unplug,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function IntegrationsSettings() {
  const tabs = [
    { id: "Profile", label: "Profile", icon: User2, path: "/settings/profile" },
    { id: "users", label: "Users", icon: Users, path: "/settings/users" },
    { id: "integrations", label: "Integrations", icon: LinkIcon, path: "/settings/integrations" },
    { id: "triage", label: "Triage & Workflow", icon: Layers, path: "/settings/triage" },
    { id: "ai", label: "AI & Automation", icon: Sparkles, path: "/settings/ai" },
    { id: "templates", label: "Templates & Batching", icon: FileText, path: "/settings/templates" },
    { id: "alerts", label: "Alerts & Notifications", icon: Bell, path: "/settings/alerts" },
    { id: "security", label: "Security & Compliance", icon: Shield, path: "/settings/security" },
    { id: "advanced", label: "Admin Only", icon: Settings, path: "/settings/advanced" },
  ];

  const location = useLocation();
  const navigate = useNavigate();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [{ data: configData, fetching, error }, refetch] = useFindFirst(api.appConfiguration, {
    select: {
      id: true,
      connectedMailbox: true,
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiresAt: true,
      microsoftConnectionStatus: true,
      microsoftLastVerifiedAt: true,
      updatedAt: true,
    },
  });

  const config = configData as any;

  // ── Actions ────────────────────────────────────────────────────────────────
  const [{ fetching: connectingFetching }, getAuthUrl] = useGlobalAction(api.getAuthUrl);
  const [{ fetching: disconnectingFetching }, disconnectOutlook] = useGlobalAction(api.disconnectOutlook);
  const [{ fetching: verifyingFetching }, verifyMicrosoftConnection] = useGlobalAction(api.verifyMicrosoftConnection);

  const [connectionVerified, setConnectionVerified] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isConnected =
    config?.microsoftConnectionStatus === "connected" &&
    !!config?.microsoftAccessToken;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleConnect = async () => {
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

  const handleDisconnect = async () => {
    try {
      await disconnectOutlook();
      setConnectionVerified(false);
      await refetch({ requestPolicy: "network-only" });
      toast.success("Disconnected from Microsoft 365");
    } catch {
      toast.error("Failed to disconnect from Microsoft 365");
    }
  };

  const handleVerify = async () => {
    try {
      const result = await verifyMicrosoftConnection();
      const data = (result as any)?.data ?? result;
      if (data?.connected) {
        setConnectionVerified(true);
        await refetch({ requestPolicy: "network-only" });
        toast.success("Connection verified successfully");
      } else {
        setConnectionVerified(false);
        const msg =
          typeof data?.error === "string"
            ? data.error
            : "Connection verification failed";
        toast.error(msg);
      }
    } catch (err: any) {
      setConnectionVerified(false);
      toast.error(err?.message ?? "Failed to verify connection");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getTimeAgo = (date: string | null | undefined) => {
    if (!date) return "Never";
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Settings</h2>
      </div>
      <nav className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
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
      </nav>
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 p-8 text-slate-400">Loading...</div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 p-8 text-red-400">
          Error loading configuration: {error.toString()}
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-auto bg-slate-950">
        {/* HEADER with buttons */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Integrations</h1>
              <p className="text-sm text-slate-400 mt-1">
                Connect your email and third-party services
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8">
          <div className="space-y-4">

            {/* Microsoft 365 card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-4">

                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isConnected
                    ? "bg-teal-500/15 border border-teal-500/30"
                    : "bg-slate-700/60 border border-slate-600"
                }`}>
                  <Inbox className={`w-6 h-6 ${isConnected ? "text-teal-400" : "text-slate-400"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-semibold text-white">Microsoft 365</h3>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600">
                        <AlertCircle className="w-3 h-3" />
                        Not connected
                      </span>
                    )}
                  </div>

                  {isConnected ? (
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
                  {isConnected ? (
                    <>
                      <Button
                        onClick={handleVerify}
                        disabled={verifyingFetching}
                        variant="outline"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${verifyingFetching ? "animate-spin" : ""}`} />
                        {verifyingFetching ? "Verifying..." : "Verify"}
                      </Button>
                      <Button
                        onClick={handleDisconnect}
                        disabled={disconnectingFetching}
                        variant="outline"
                        className="border-red-800/60 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700"
                      >
                        <Unplug className="h-4 w-4 mr-2" />
                        {disconnectingFetching ? "Disconnecting..." : "Disconnect"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleConnect}
                      disabled={connectingFetching}
                      className="bg-teal-500 text-white hover:bg-teal-600"
                    >
                      {connectingFetching ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Shopify — coming soon */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-6 h-6 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-semibold text-white">Shopify</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-500 border border-slate-600">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">
                    Sync orders, customers, and fulfilment data from your Shopify store.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER with buttons */}
        <div className="border-t border-slate-800 bg-slate-900/50 px-8 py-6">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
