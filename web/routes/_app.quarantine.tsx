import { useMemo, useState } from "react";
import { useFindMany, useGlobalAction } from "@gadgetinc/react";
import { Link as RouterLink, useLocation } from "react-router";
import { api } from "../api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton, PrimaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
import { timeAgo } from "@/components/healthStatus";
import {
  LayoutDashboard,
  MessageSquare,
  Layers,
  FileText,
  PenLine,
  Settings,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mail,
  User,
  AlertTriangle,
} from "lucide-react";

// ── Customer Sidebar ────────────────────────────────────────────────
const customerTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "conversations", label: "Conversations", icon: MessageSquare, path: "/conversations" },
  { id: "threads", label: "Threads", icon: MessageSquare, path: "/threads" },
  { id: "triage", label: "Triage", icon: Layers, path: "/triage" },
  { id: "quarantine", label: "Quarantine", icon: ShieldAlert, path: "/quarantine" },
  {
    id: "templates",
    label: "Templates",
    icon: FileText,
    path: "/templates",
    children: [
      { id: "templates-list", label: "Templates", icon: FileText, path: "/templates" },
      { id: "signatures", label: "Signatures", icon: PenLine, path: "/signatures" },
    ],
  },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

function CustomerSidebar({ currentPath }: { currentPath: string }) {
  const isActive = (path: string, children?: { path: string }[]) => {
    if (path === "/") return currentPath === "/";
    if (children) {
      return children.some((child) => currentPath === child.path || currentPath.startsWith(child.path + "/"));
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Customer</h2>
      </div>
      <nav className="space-y-1">
        {customerTabs.map(({ id, label, icon: Icon, path, children }) => (
          <div key={id}>
            <RouterLink
              to={children ? children[0].path : path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(path, children)
                  ? "bg-teal-600/10 text-teal-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{label}</span>
            </RouterLink>
            {children && (
              <div className="ml-7 mt-1 space-y-1 border-l border-slate-800 pl-3">
                {children.map((child) => (
                  <RouterLink
                    key={child.id}
                    to={child.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${
                      currentPath === child.path || currentPath.startsWith(child.path + "/")
                        ? "text-teal-400 font-medium"
                        : "text-slate-500 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{child.label}</span>
                  </RouterLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending_review: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  approved: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  rejected: "text-red-300 bg-red-500/10 border-red-500/30",
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default function QuarantinePage() {
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [{ data: rawQuarantine, fetching }, refresh] = useFindMany(api.emailQuarantine, {
    sort: { receivedAt: "Descending" },
    first: 200,
    select: {
      id: true,
      fromAddress: true,
      fromName: true,
      subject: true,
      bodyPreview: true,
      receivedAt: true,
      status: true,
      classificationReason: true,
      approvedAt: true,
      rejectedAt: true,
      providerMessageId: true,
    },
  });

  const [{ fetching: approving }, approveQuarantinedEmail] = useGlobalAction(api.approveQuarantinedEmail);

  const quarantineItems = (rawQuarantine as any[]) || [];
  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return quarantineItems;
    return quarantineItems.filter((item) => item.status === statusFilter);
  }, [quarantineItems, statusFilter]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

  const handleApprove = async (itemId: string) => {
    await approveQuarantinedEmail({ quarantineId: itemId, addSenderToAllowlist: false });
    await refresh();
  };

  return (
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Quarantine"
          subtitle="Review and approve quarantined emails"
          actions={
            <>
              <SecondaryButton onClick={() => refresh()} disabled={fetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                {fetching ? "Refreshing..." : "Refresh"}
              </SecondaryButton>
            </>
          }
        />

        <div className="px-8 pt-6">
          <div className="flex items-center gap-2">
            {(["pending_review", "approved", "rejected", "all"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs uppercase tracking-wide px-3 py-1 rounded-full border ${
                  statusFilter === status
                    ? "border-teal-500/40 text-teal-300 bg-teal-500/10"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex mt-4">
          {/* Left list */}
          <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/30">
            <div className="flex-1 overflow-y-auto">
              {fetching ? (
                <EmptyState title="Loading quarantined emails..." />
              ) : filteredItems.length === 0 ? (
                <EmptyState title="No quarantined emails" description="Try changing the filter or refresh." />
              ) : (
                <div className="divide-y divide-slate-800">
                  {filteredItems.map((item) => {
                    const isSelected = item.id === selectedId;
                    const statusClass = statusStyles[item.status] || statusStyles.pending_review;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          isSelected ? "bg-slate-800/80 border-l-2 border-teal-500" : "hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-100 truncate">
                              {item.subject || "(No subject)"}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 truncate">
                              {item.fromName || item.fromAddress || "Unknown sender"}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          {timeAgo(item.receivedAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right detail */}
          <div className="flex-1 overflow-y-auto bg-slate-950">
            {!selectedItem ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a quarantined email to review</p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-white">
                          {selectedItem.subject || "(No subject)"}
                        </h2>
                        <div className="text-sm text-slate-400 mt-1">
                          {selectedItem.fromName || selectedItem.fromAddress || "Unknown sender"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          statusStyles[selectedItem.status] || statusStyles.pending_review
                        }`}
                      >
                        {selectedItem.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Sender
                        </div>
                        <div className="text-sm text-slate-200">{selectedItem.fromAddress || "—"}</div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          Received
                        </div>
                        <div className="text-sm text-slate-200">{formatDateTime(selectedItem.receivedAt)}</div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          Reason
                        </div>
                        <div className="text-sm text-slate-200">
                          {selectedItem.classificationReason || "Manual review"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Message ID</div>
                        <div className="text-xs text-slate-300 break-all">
                          {selectedItem.providerMessageId || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                      <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Preview</div>
                      <div className="text-sm text-slate-300 whitespace-pre-wrap">
                        {selectedItem.bodyPreview || "No preview available."}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <PrimaryButton
                        onClick={() => handleApprove(selectedItem.id)}
                        disabled={approving || selectedItem.status === "approved"}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {selectedItem.status === "approved" ? "Approved" : "Approve"}
                      </PrimaryButton>
                      <SecondaryButton disabled>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject (next)
                      </SecondaryButton>
                    </div>
                  </div>

                  {selectedItem.approvedAt && (
                    <div className="text-xs text-slate-500">
                      Approved {formatDateTime(selectedItem.approvedAt)}
                    </div>
                  )}
                  {selectedItem.rejectedAt && (
                    <div className="text-xs text-slate-500">
                      Rejected {formatDateTime(selectedItem.rejectedAt)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}