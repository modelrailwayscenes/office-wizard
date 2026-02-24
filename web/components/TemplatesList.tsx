import { useRef } from "react";
import { useNavigate } from "react-router";
import { useFindMany, useGlobalAction, useUser } from "@gadgetinc/react";
import { AutoTable } from "@/components/auto";
import { Button } from "@/components/ui/button";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Plus, Download, Upload, ChevronDown } from "lucide-react";
import { api } from "../api";
import { toast } from "sonner";

export function TemplatesList() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [{ data: templates, fetching, error }, refetch] = useFindMany(api.template, {
    first: 100,
    sort: { updatedAt: "Descending" },
  });
  const [{ fetching: importing }, importTemplates] = useGlobalAction(api.importTemplates);
  const [{ fetching: seeding }, seedTemplates] = useGlobalAction(api.seedCustomerTemplates);
  const user = useUser(api, { select: { roleList: { key: true } } });
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList.map((r: any) => (typeof r === "string" ? r : r?.key)).filter(Boolean)
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  const handleExport = async (format: "json" | "csv") => {
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${base}/export/templates?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `templates-export.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  const handleSeed = async () => {
    try {
      const r = await seedTemplates({});
      const res = r as { created?: number; skipped?: number; errors?: string[] } | undefined;
      const created = res?.created ?? 0;
      const skipped = res?.skipped ?? 0;
      const errs = res?.errors ?? [];
      if (errs.length > 0) {
        toast.error(`Seeded ${created} (${skipped} existed). First error: ${errs[0]}`);
      } else {
        toast.success(`Seeded ${created} templates (${skipped} already existed)`);
      }
      void refetch({ requestPolicy: "network-only" });
    } catch (e) {
      toast.error(`Seed failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format = ext === "csv" ? "csv" : ext === "json" ? "json" : null;
    if (!format) {
      toast.error("Please select a .json or .csv file");
      return;
    }
    try {
      const content = await file.text();
      const result = (await importTemplates({ format, content })) as { created?: number; updated?: number; errors?: string[] } | undefined;
      const { created, updated, errors } = result ?? {};
      const msg = `Imported: ${created ?? 0} created, ${updated ?? 0} updated`;
      if (errors?.length) {
        toast.warning(`${msg}. ${errors.length} error(s): ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? "…" : ""}`);
      } else {
        toast.success(msg);
      }
      void refetch({ requestPolicy: "network-only" });
    } catch (e) {
      toast.error(`Import failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      e.target.value = "";
    }
  };

  const formatCategory = (category: string) =>
    category.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const formatSafetyLevel = (level: string) => level.charAt(0).toUpperCase() + level.slice(1);
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  if (error) {
    return (
      <div className="flex-1 overflow-auto bg-slate-950 p-8">
        <p className="text-red-400 text-lg">Error loading templates: {error.message}</p>
      </div>
    );
  }

  if (fetching && !templates) {
    return (
      <div className="flex-1 overflow-auto bg-slate-950 p-8">
        <p className="text-slate-400 text-lg">Loading templates...</p>
      </div>
    );
  }

  const isEmpty = !templates || templates.length === 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
        <h1 className="text-2xl font-semibold text-white">Email Templates</h1>
        <p className="text-sm text-slate-400 mt-1">Create and manage email response templates</p>
      </div>
      <div className="px-8 py-6">
        <div className="flex justify-end gap-2 mb-6">
          <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || isEmpty}
            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Upload className={`mr-2 h-4 w-4 ${importing ? "animate-pulse" : ""}`} />
            {importing ? "Importing…" : "Import"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isEmpty}
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
              <DropdownMenuItem onClick={() => handleExport("json")} className="text-slate-200 focus:bg-slate-800 focus:text-white">
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")} className="text-slate-200 focus:bg-slate-800 focus:text-white">
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => navigate("/customer/support/templates/new")}
            className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-800/50 rounded-xl border border-slate-700">
            <FileText className="h-20 w-20 text-slate-700 mb-6" />
            <h2 className="text-2xl font-semibold text-white mb-2">No email templates yet</h2>
            <p className="text-slate-400 mb-8 text-center max-w-md">
              Create your first template to automate email responses and save time
            </p>
            <div className="flex gap-3">
              {isAdmin && (
                <Button
                  onClick={handleSeed}
                  disabled={seeding}
                  variant="outline"
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {seeding ? "Seeding…" : "Seed Sample Templates"}
                </Button>
              )}
              <Button
                onClick={() => navigate("/customer/support/templates/new")}
                className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <AutoTable
              model={api.template}
              columns={[
                { header: "Name", field: "name" },
                {
                  header: "Category",
                  render: ({ record }: { record: any }) => (
                    <UnifiedBadge
                      type={record.category}
                      label={formatCategory(record.category)}
                    />
                  ),
                },
                { header: "Subject", field: "subject" },
                {
                  header: "Safety Level",
                  render: ({ record }: { record: any }) => (
                    <span className="text-slate-300">{formatSafetyLevel(record.safetyLevel)}</span>
                  ),
                },
                {
                  header: "Auto Send",
                  render: ({ record }: { record: any }) => (
                    <span className="text-slate-300">{record.autoSendEnabled ? "Yes" : "No"}</span>
                  ),
                },
                {
                  header: "Updated",
                  render: ({ record }: { record: any }) => (
                    <span className="text-slate-400">{formatDate(record.updatedAt)}</span>
                  ),
                },
              ]}
              onClick={(record: any) => navigate(`/customer/support/templates/${record.id}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}