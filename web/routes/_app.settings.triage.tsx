import { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useFindFirst, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingsButtonGroup } from "@/components/SettingsButtonGroup";
import { toast } from "sonner";
import {
  Layers, GitBranch, Target, Workflow,
  User2, Users as UsersIcon, Link as LinkIcon,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
} from "lucide-react";

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

const SLA_OPTIONS = [
  { value: "15min", label: "15 minutes" },
  { value: "30min", label: "30 minutes" },
  { value: "1hr",   label: "1 hour" },
  { value: "2hr",   label: "2 hours" },
  { value: "4hr",   label: "4 hours" },
  { value: "8hr",   label: "8 hours" },
  { value: "24hr",  label: "24 hours" },
  { value: "48hr",  label: "48 hours" },
];

function PriorityCard({ level, label, color, value, onChange }: {
  level: string;
  label: string;
  color: "red" | "orange" | "yellow" | "blue";
  value: string;
  onChange: (v: string) => void;
}) {
  const badge = {
    red:    "bg-red-500/10 text-red-400 border border-red-500/20",
    orange: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    blue:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  }[color];

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-3">
      <Badge className={`${badge} font-semibold text-xs px-2 py-0.5`}>{level}</Badge>
      <p className="text-sm text-slate-400">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {SLA_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-slate-700">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function TriageSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });

  const handleCancel = () => {
    navigate(-1);
  };

  const [{ data: configData, fetching, error }] = useFindFirst(api.appConfiguration);
  const config = configData as any;
  const [{ fetching: saving }, updateConfig] = useAction(api.appConfiguration.update);

  // Auto-Triage
  const [autoTriageEnabled, setAutoTriageEnabled]     = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);
  const [manualReviewQueue, setManualReviewQueue]     = useState(true);

  // SLA Targets
  const [slaP0, setSlaP0] = useState("1hr");
  const [slaP1, setSlaP1] = useState("4hr");
  const [slaP2, setSlaP2] = useState("24hr");
  const [slaP3, setSlaP3] = useState("48hr");

  // Priority Scoring
  const [riskScoring, setRiskScoring]                     = useState(true);
  const [timeSensitivity, setTimeSensitivity]             = useState(true);
  const [sentimentAnalysis, setSentimentAnalysis]         = useState(true);
  const [customerValueScoring, setCustomerValueScoring]   = useState(true);
  const [ageWeightPointsPerDay, setAgeWeightPointsPerDay] = useState("2");

  // Workflow
  const [autoResolveSimple, setAutoResolveSimple]             = useState(false);
  const [autoSuggestResponses, setAutoSuggestResponses]       = useState(true);
  const [workflowBatchProcessing, setWorkflowBatchProcessing] = useState(true);

  useEffect(() => {
    if (!config) return;
    setAutoTriageEnabled(config.autoTriageEnabled ?? false);
    setConfidenceThreshold([config.autoSendConfidenceThreshold ? config.autoSendConfidenceThreshold * 100 : 85]);
    setManualReviewQueue(config.manualReviewQueue ?? true);
    setSlaP0(config.slaP0 || "1hr");
    setSlaP1(config.slaP1 || "4hr");
    setSlaP2(config.slaP2 || "24hr");
    setSlaP3(config.slaP3 || "48hr");
    setRiskScoring(config.riskScoring ?? true);
    setTimeSensitivity(config.timeSensitivity ?? true);
    setSentimentAnalysis(config.sentimentAnalysis ?? true);
    setCustomerValueScoring(config.customerValueScoring ?? true);
    if (config.ageWeightPointsPerDay) setAgeWeightPointsPerDay(String(config.ageWeightPointsPerDay));
    setAutoResolveSimple(config.autoResolveSimple ?? false);
    setAutoSuggestResponses(config.autoSuggestResponses ?? true);
    setWorkflowBatchProcessing(config.workflowBatchProcessing ?? true);
  }, [config]);

  const handleSave = async () => {
    if (!config?.id) { toast.error("Configuration not found"); return; }
    try {
      await (updateConfig as any)({
        id: config.id,
        // Auto-Triage
        autoTriageEnabled,
        manualReviewQueue,
        autoSendConfidenceThreshold: confidenceThreshold[0] / 100,
        // SLA
        slaP0, slaP1, slaP2, slaP3,
        // Priority Scoring
        riskScoring,
        timeSensitivity,
        sentimentAnalysis,
        customerValueScoring,
        ageWeightPointsPerDay: Number(ageWeightPointsPerDay),
        // Workflow
        autoResolveSimple,
        autoSuggestResponses,
        workflowBatchProcessing,
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
        <Sidebar currentPath={location.pathname} />
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
              <h1 className="text-2xl font-semibold text-white">Triage & Workflow</h1>
              <p className="text-sm text-slate-400 mt-1">
                Configure how emails are prioritised and processed
              </p>
            </div>
            <SettingsButtonGroup
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8">
          <div className="space-y-4">

            {/* Auto-Triage */}
            <Section
              icon={Layers}
              title="Auto-Triage"
              description="Automatically classify and prioritise incoming emails"
            >
              <SettingRow
                label="Enable Auto-Triage"
                description="Automatically classify emails by intent, sentiment, and priority"
              >
                <Switch checked={autoTriageEnabled} onCheckedChange={setAutoTriageEnabled} />
              </SettingRow>

              <div className="px-6 py-4">
                <Label className="text-sm font-medium text-white">Confidence Threshold</Label>
                <p className="text-sm text-slate-400 mt-0.5 mb-4">
                  Only auto-classify emails with {confidenceThreshold[0]}% or higher confidence
                </p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={confidenceThreshold}
                    onValueChange={setConfidenceThreshold}
                    min={50} max={100} step={5}
                    disabled={!autoTriageEnabled}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm font-semibold text-white text-right">
                    {confidenceThreshold[0]}%
                  </span>
                </div>
              </div>

              <SettingRow
                label="Manual Review Queue"
                description="Send low-confidence classifications to a manual review queue"
              >
                <Switch
                  checked={manualReviewQueue}
                  onCheckedChange={setManualReviewQueue}
                  disabled={!autoTriageEnabled}
                />
              </SettingRow>
            </Section>

            {/* SLA Targets */}
            <Section
              icon={Target}
              title="SLA Targets"
              description="Set response time targets for each priority level"
            >
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <PriorityCard level="P0" label="Critical / Urgent" color="red"    value={slaP0} onChange={setSlaP0} />
                  <PriorityCard level="P1" label="High Priority"     color="orange" value={slaP1} onChange={setSlaP1} />
                  <PriorityCard level="P2" label="Medium Priority"   color="yellow" value={slaP2} onChange={setSlaP2} />
                  <PriorityCard level="P3" label="Low Priority"      color="blue"   value={slaP3} onChange={setSlaP3} />
                </div>
              </div>
            </Section>

            {/* Priority Scoring */}
            <Section
              icon={GitBranch}
              title="Priority Scoring"
              description="Configure which factors influence email priority scoring"
            >
              <SettingRow
                label="Risk & Escalation Scoring"
                description="Detect legal threats, chargebacks, and escalation language"
              >
                <Switch checked={riskScoring} onCheckedChange={setRiskScoring} />
              </SettingRow>
              <SettingRow
                label="Time Sensitivity Detection"
                description="Identify deadlines, urgency keywords, and time-bound requests"
              >
                <Switch checked={timeSensitivity} onCheckedChange={setTimeSensitivity} />
              </SettingRow>
              <SettingRow
                label="Sentiment Analysis"
                description="Factor in customer emotion and frustration levels"
              >
                <Switch checked={sentimentAnalysis} onCheckedChange={setSentimentAnalysis} />
              </SettingRow>
              <SettingRow
                label="Customer Value Scoring"
                description="Prioritise based on customer lifetime value and order history"
              >
                <Switch checked={customerValueScoring} onCheckedChange={setCustomerValueScoring} />
              </SettingRow>
              <SettingRow
                label="Age Weighting"
                description="Increase priority score for older unanswered emails"
              >
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={ageWeightPointsPerDay}
                    onChange={(e) => setAgeWeightPointsPerDay(e.target.value)}
                    min={0} max={10}
                    className="w-20 bg-slate-800 border-slate-700 text-white text-center"
                  />
                  <span className="text-sm text-slate-400 whitespace-nowrap">points per day</span>
                </div>
              </SettingRow>
            </Section>

            {/* Workflow Mode */}
            <Section
              icon={Workflow}
              title="Workflow Mode"
              description="Configure automation and response handling behaviour"
            >
              <SettingRow
                label="Auto-Resolve Simple Queries"
                description="Automatically resolve FAQs and simple informational requests"
              >
                <Switch checked={autoResolveSimple} onCheckedChange={setAutoResolveSimple} />
              </SettingRow>
              <SettingRow
                label="Auto-Suggest Responses"
                description="Generate draft responses for agent review before sending"
              >
                <Switch checked={autoSuggestResponses} onCheckedChange={setAutoSuggestResponses} />
              </SettingRow>
              <SettingRow
                label="Batch Processing"
                description="Process similar emails together for efficiency"
              >
                <Switch checked={workflowBatchProcessing} onCheckedChange={setWorkflowBatchProcessing} />
              </SettingRow>
            </Section>

          </div>
        </div>

        {/* FOOTER with buttons */}
        <div className="border-t border-slate-800 bg-slate-900/50 px-8 py-6">
          <SettingsButtonGroup
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}
