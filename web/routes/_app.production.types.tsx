import { useMemo, useState } from "react";
import { useAction, useFindMany } from "@gadgetinc/react";
import { Plus, Save, Trash2 } from "lucide-react";
import { api } from "../api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const categoryOptions = ["personalised", "standard_print", "paint_only", "pack_only"];
const priorityOptions = ["P0", "P1", "P2", "P3"];

const prettyJson = (value: any) => {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

export default function ProductionTypesPage() {
  const [{ data: rows, fetching }, refresh] = useFindMany(api.productionType, {
    first: 200,
    sort: { updatedAt: "Descending" } as any,
    select: {
      id: true,
      name: true,
      category: true,
      isActive: true,
      defaultPriorityBand: true,
      defaultSlaDays: true,
      batchingKey: true,
      classificationRules: true,
      statusWorkflow: true,
      updatedAt: true,
    } as any,
  });
  const [{ fetching: creating }, createType] = useAction(api.productionType.create);
  const [{ fetching: updating }, updateType] = useAction(api.productionType.update);
  const [{ fetching: deleting }, deleteType] = useAction(api.productionType.delete);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => ((rows as any[] | undefined) || []).find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );
  const [draft, setDraft] = useState<any>(null);

  const beginEdit = (row: any) => {
    setSelectedId(row.id);
    setDraft({
      ...row,
      classificationRulesText: prettyJson(row.classificationRules),
      statusWorkflowText: prettyJson(row.statusWorkflow),
    });
  };

  const parseJson = (value: string, label: string) => {
    if (!value.trim()) return null;
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON`);
    }
  };

  const onSave = async () => {
    if (!draft?.id) return;
    try {
      const classificationRules = parseJson(draft.classificationRulesText || "", "Classification rules");
      const statusWorkflow = parseJson(draft.statusWorkflowText || "", "Status workflow");
      await (updateType as any)({
        id: draft.id,
        name: draft.name,
        category: draft.category,
        isActive: Boolean(draft.isActive),
        defaultPriorityBand: draft.defaultPriorityBand || null,
        defaultSlaDays: draft.defaultSlaDays === "" ? null : Number(draft.defaultSlaDays),
        batchingKey: draft.batchingKey || null,
        classificationRules,
        statusWorkflow,
      });
      toast.success("Production type saved");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save production type");
    }
  };

  const onCreate = async () => {
    const created = await (createType as any)({
      name: `New type ${new Date().toLocaleTimeString()}`,
      category: "personalised",
      isActive: true,
      defaultPriorityBand: "P2",
      defaultSlaDays: 3,
      classificationRules: {
        keywordsAny: [],
        requiresPersonalisation: false,
        replenishment: { enabled: false, skuThresholds: [] },
      },
      statusWorkflow: {
        allowedTransitions: {},
      },
    });
    await refresh();
    if (created?.id) {
      beginEdit(created);
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this production type?")) return;
    await (deleteType as any)({ id: selectedId });
    setSelectedId(null);
    setDraft(null);
    await refresh();
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Production Types"
        subtitle="Maintain deterministic classification and workflow rules"
        actions={
          <Button onClick={onCreate} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            Add type
          </Button>
        }
      />
      <div className="px-8 pb-8 pt-4 grid grid-cols-12 gap-4 h-full overflow-hidden">
        <Card className="col-span-4 overflow-auto">
          <div className="p-4 border-b border-border text-sm font-medium">Types</div>
          <div className="p-2 space-y-1">
            {((rows as any[] | undefined) || []).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => beginEdit(row)}
                className={`w-full text-left rounded-lg px-3 py-2 ${
                  selectedId === row.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <div className="text-sm font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.category}</div>
              </button>
            ))}
            {!fetching && (((rows as any[] | undefined) || []).length === 0) && (
              <div className="text-sm text-muted-foreground p-2">No production types yet.</div>
            )}
          </div>
        </Card>

        <Card className="col-span-8 overflow-auto">
          {!selected || !draft ? (
            <div className="h-full p-6 text-sm text-muted-foreground">Select a production type to edit.</div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Edit type</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onDelete} disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button onClick={onSave} disabled={updating}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
                <Select value={draft.category || "personalised"} onValueChange={(value) => setDraft({ ...draft, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={draft.defaultPriorityBand || "P2"} onValueChange={(value) => setDraft({ ...draft, defaultPriorityBand: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={draft.defaultSlaDays ?? ""}
                  onChange={(e) => setDraft({ ...draft, defaultSlaDays: e.target.value })}
                  placeholder="Default SLA days"
                />
                <Input value={draft.batchingKey || ""} onChange={(e) => setDraft({ ...draft, batchingKey: e.target.value })} placeholder="Batching key" />
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    checked={Boolean(draft.isActive)}
                    onCheckedChange={(checked) => setDraft({ ...draft, isActive: Boolean(checked) })}
                  />
                  <span className="text-sm">Active</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Classification rules JSON</div>
                <Textarea
                  value={draft.classificationRulesText || ""}
                  onChange={(e) => setDraft({ ...draft, classificationRulesText: e.target.value })}
                  className="min-h-[220px] font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Status workflow JSON</div>
                <Textarea
                  value={draft.statusWorkflowText || ""}
                  onChange={(e) => setDraft({ ...draft, statusWorkflowText: e.target.value })}
                  className="min-h-[220px] font-mono text-xs"
                />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
