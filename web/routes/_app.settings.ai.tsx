import { type MetaFunction, Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useFindFirst, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SettingsButtonGroup } from "@/components/SettingsButtonGroup";
import {
  User2, Users as UsersIcon, Link as LinkIcon, Layers, Sparkles,
  FileText, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "AI & Automation Settings" },
  { name: "description", content: "Configure AI models and automation settings" },
];

const tabs = [
  { id: "summary",    label: "Summary",               icon: User2,        path: "/settings/summary" },
  { id: "profile",    label: "Profile",               icon: User2,        path: "/settings/profile" },
  { id: "users",      label: "Users",                 icon: UsersIcon,    path: "/settings/users" },
  { id: "triage",     label: "Triage & Workflow",      icon: Layers,      path: "/settings/triage" },
  { id: "ai",         label: "AI & Automation",        icon: Sparkles,    path: "/settings/ai" },
  { id: "templates",  label: "Templates & Batching",   icon: FileText,    path: "/settings/templates" },
  { id: "security",   label: "Security & Compliance",  icon: Shield,      path: "/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations",        icon: LinkIcon,     path: "/settings/integrations" },
  { id: "alerts",     label: "Alerts & Notifications", icon: Bell,        path: "/settings/alerts" },
  { id: "advanced",   label: "Advanced Settings",      icon: SettingsIcon, path: "/settings/advanced" },
];

// ── Shared sidebar ─────────────────────────────────────────────────────────────
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

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-slate-700/60">{children}</div>
    </div>
  );
}

// ── Setting row ────────────────────────────────────────────────────────────────
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

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AIAutomationSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });

  const handleCancel = () => {
    navigate(-1);
  };

  // Cast to any — all 'never' errors are Gadget type-gen lag; fields exist in schema
  const [{ data: configData, fetching, error }] = useFindFirst(api.appConfiguration);
  const config = configData as any;

  const [{ fetching: updating }, updateConfig] = useAction(api.appConfiguration.update);

  // ── Local form state ─────────────────────────────────────────────────────
  const [classificationProvider, setClassificationProvider] = useState("openai");
  const [openaiModel, setOpenaiModel] = useState("gpt-4");
  const [temperature, setTemperature] = useState([0.7]);
  const [autoSendGlobalEnabled, setAutoSendGlobalEnabled] = useState(false);
  const [autoSendConfidenceThreshold, setAutoSendConfidenceThreshold] = useState([0.85]);
  const [autoSendProductInstructions, setAutoSendProductInstructions] = useState(false);
  const [autoSendTrackingRequests, setAutoSendTrackingRequests] = useState(false);
  const [autoSendGeneralFAQ, setAutoSendGeneralFAQ] = useState(false);
  const [autoSendOpeningHours, setAutoSendOpeningHours] = useState(false);
  const [chatgptIntegrationEnabled, setChatgptIntegrationEnabled] = useState(true);
  const [autoTriageEnabled, setAutoTriageEnabled] = useState(false);

  // ── Seed from database ───────────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    setClassificationProvider(config.classificationProvider ?? "openai");
    setOpenaiModel(config.openaiModel ?? "gpt-4");
    setTemperature([config.temperature ?? 0.7]);
    setAutoSendGlobalEnabled(config.autoSendGlobalEnabled ?? false);
    setAutoSendConfidenceThreshold([config.autoSendConfidenceThreshold ?? 0.85]);
    setAutoSendProductInstructions(config.autoSendProductInstructions ?? false);
    setAutoSendTrackingRequests(config.autoSendTrackingRequests ?? false);
    setAutoSendGeneralFAQ(config.autoSendGeneralFAQ ?? false);
    setAutoSendOpeningHours(config.autoSendOpeningHours ?? false);
    setChatgptIntegrationEnabled(config.chatgptIntegrationEnabled ?? true);
    setAutoTriageEnabled(config.autoTriageEnabled ?? false);
  }, [config]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!config?.id) return;
    try {
      await (updateConfig as any)({
        id: config.id,
        classificationProvider,
        openaiModel,
        temperature: temperature[0],
        autoSendGlobalEnabled,
        autoSendConfidenceThreshold: autoSendConfidenceThreshold[0],
        autoSendProductInstructions,
        autoSendTrackingRequests,
        autoSendGeneralFAQ,
        autoSendOpeningHours,
        chatgptIntegrationEnabled,
        autoTriageEnabled,
      });
      toast.success("AI & Automation settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
      console.error(err);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8">
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} user={user} />
        <div className="flex-1 p-8">
          <div className="text-red-400">Error loading settings: {error.message}</div>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-slate-950">
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">AI & Automation</h1>
              <p className="text-sm text-slate-400 mt-1">
                Configure AI models and automation behaviour
              </p>
            </div>
            <SettingsButtonGroup
              onSave={handleSave}
              onCancel={handleCancel}
              saving={updating || fetching}
            />
          </div>
        </div>

        <div className="p-8">
          <div className="space-y-4">

          {/* ── AI Models ── */}
          <Section
            title="AI Models"
            description="Choose which AI service and model to use for classification and response generation"
          >
            <SettingRow
              label="Classification Provider"
              description="The AI service used to classify incoming emails"
            >
              <Select value={classificationProvider} onValueChange={setClassificationProvider}>
                <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="openai" className="text-white hover:bg-slate-700">OpenAI</SelectItem>
                  <SelectItem value="custom" className="text-white hover:bg-slate-700">Custom Model</SelectItem>
                  <SelectItem value="rules_based" className="text-white hover:bg-slate-700">Rules Based</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              label="OpenAI Model"
              description="The GPT model version to use for drafts and classification"
            >
              <Select value={openaiModel} onValueChange={setOpenaiModel}>
                <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="gpt-4" className="text-white hover:bg-slate-700">GPT-4</SelectItem>
                  <SelectItem value="gpt-4-turbo" className="text-white hover:bg-slate-700">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo" className="text-white hover:bg-slate-700">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              label="Temperature"
              description="Response creativity — 0 is focused and consistent, 1 is more creative"
            >
              <div className="w-48 flex items-center gap-4">
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  min={0} max={1} step={0.1}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-white w-8 text-right">
                  {temperature[0].toFixed(1)}
                </span>
              </div>
            </SettingRow>
          </Section>

          {/* ── Auto-Draft ── */}
          <Section
            title="Auto-Draft"
            description="Automatically generate draft replies for classified incoming emails"
          >
            <SettingRow
              label="Enable Auto-Draft"
              description="Master switch — turn on to allow drafts to be created automatically"
            >
              <Switch checked={autoSendGlobalEnabled} onCheckedChange={setAutoSendGlobalEnabled} />
            </SettingRow>

            <SettingRow
              label="Confidence Threshold"
              description="Minimum AI confidence required before a draft is created (0–1)"
            >
              <div className="w-48 flex items-center gap-4">
                <Slider
                  value={autoSendConfidenceThreshold}
                  onValueChange={setAutoSendConfidenceThreshold}
                  min={0} max={1} step={0.05}
                  className="flex-1"
                  disabled={!autoSendGlobalEnabled}
                />
                <span className={`text-sm font-medium w-8 text-right ${!autoSendGlobalEnabled ? "text-slate-500" : "text-white"}`}>
                  {autoSendConfidenceThreshold[0].toFixed(2)}
                </span>
              </div>
            </SettingRow>

            <SettingRow
              label="Product Instructions"
              description="Auto-draft responses to product help and how-to queries"
            >
              <Switch
                checked={autoSendProductInstructions}
                onCheckedChange={setAutoSendProductInstructions}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Tracking Requests"
              description="Auto-draft responses to order tracking enquiries"
            >
              <Switch
                checked={autoSendTrackingRequests}
                onCheckedChange={setAutoSendTrackingRequests}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="General FAQ"
              description="Auto-draft responses to common frequently asked questions"
            >
              <Switch
                checked={autoSendGeneralFAQ}
                onCheckedChange={setAutoSendGeneralFAQ}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>

            <SettingRow
              label="Opening Hours"
              description="Auto-draft responses to opening hours and availability enquiries"
            >
              <Switch
                checked={autoSendOpeningHours}
                onCheckedChange={setAutoSendOpeningHours}
                disabled={!autoSendGlobalEnabled}
              />
            </SettingRow>
          </Section>

          {/* ── Entity Extraction ── */}
          <Section
            title="Entity Extraction"
            description="Automatically extract key information from email content — always on"
          >
            {[
              { label: "Order IDs",       description: "Identify and extract order numbers" },
              { label: "Customer Names",  description: "Identify customer names from email content" },
              { label: "Deadlines",       description: "Identify time-sensitive dates and requests" },
              { label: "Product Names",   description: "Identify mentioned products" },
              { label: "Money Amounts",   description: "Identify monetary values and refund amounts" },
            ].map(({ label, description }) => (
              <SettingRow key={label} label={label} description={description}>
                <Switch checked disabled />
              </SettingRow>
            ))}
          </Section>

          {/* ── Learning & Improvement ── */}
          <Section
            title="Learning & Improvement"
            description="Control how the system learns from your team's feedback over time"
          >
            <SettingRow
              label="Learn from Manual Edits"
              description="Use your corrections to improve future AI draft responses"
            >
              <Switch checked={chatgptIntegrationEnabled} onCheckedChange={setChatgptIntegrationEnabled} />
            </SettingRow>

            <SettingRow
              label="Auto-Triage Learning"
              description="Improve classification based on your triage decisions"
            >
              <Switch checked={autoTriageEnabled} onCheckedChange={setAutoTriageEnabled} />
            </SettingRow>

            <SettingRow
              label="Track Template Performance"
              description="Monitor which response templates generate the best outcomes"
            >
              <Switch checked disabled />
            </SettingRow>

            <SettingRow
              label="Reset Learning Data"
              description="Clear all learned preferences and start fresh — cannot be undone"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Learning data reset — feature coming soon")}
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Reset
              </Button>
            </SettingRow>
          </Section>

          </div>
        </div>

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
