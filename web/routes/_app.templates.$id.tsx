import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useAction, useActionForm, useFindMany } from "@gadgetinc/react";
import { Controller } from "react-hook-form";
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect, InsertTable, tablePlugin, MDXEditorMethods } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

import { api } from "../api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ArrowLeft, Trash2, Plus, Code } from "lucide-react";
import { toast } from "sonner";

const categoryOptions = [
  "tracking_request",
  "product_instructions",
  "opening_hours",
  "general_faq",
  "request_more_info",
  "refund_policy",
  "delivery_info",
  "missing_item",
  "missing_delivery",
  "custom",
] as const;

const safetyLevelOptions = ["safe", "moderate", "risky"] as const;

const availableVariables = [
  { label: "Customer Name", value: "customerName" },
  { label: "Order Number", value: "orderName" },
  { label: "Tracking Number", value: "trackingNumber" },
  { label: "Company Name", value: "companyName" },
];

function formatEnumValue(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function EditTemplate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<MDXEditorMethods>(null);
  const [isCreateSigOpen, setIsCreateSigOpen] = useState(false);

  const insertVariable = (variableName: string) => {
    const editor = editorRef.current;
    if (editor) {
      editor.insertMarkdown(`{{${variableName}}}`);
    }
  };

  const [{ fetching: deleting }, deleteTemplate] = useAction(api.template.delete);

  const [{ data: signatures, fetching: fetchingSignatures }, refetchSignatures] = useFindMany(api.signature, {
    select: { id: true, name: true, body: true },
    first: 250,
  });

  // Create signature form
  const {
    register: registerSig,
    submit: submitSig,
    reset: resetSig,
    formState: { isSubmitting: creatingSig },
  } = useActionForm(api.signature.create, {
    onSuccess: async (created: unknown) => {
      toast.success("Signature created");
      setIsCreateSigOpen(false);
      resetSig();
      await refetchSignatures();
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to create signature";
      toast.error(msg);
    },
  });

  const {
    register,
    control,
    watch,
    formState: { isSubmitting, isDirty },
    submit,
    reset,
  } = useActionForm(api.template.update, {
    findBy: id!,
    defaultValues: {
      id: id!,
    } as any,
    onSuccess: () => {
      toast.success("Template updated successfully");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Validation failed";
      toast.error(`Failed to update template: ${msg}`);
    },
  });

  const bodyText = watch("template.bodyText") as string | undefined;
  const signatureField = watch("template.signature") as any;

  const signatureItems = useMemo(() => {
    return (signatures ?? []).map((s: any) => ({
      id: String(s.id),
      name: String(s.name ?? s.id),
      body: s.body,
    }));
  }, [signatures]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate({ id } as any);
      toast.success("Template deleted");
      navigate("/templates");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    if (isDirty) {
      const confirmLeave = confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmLeave) {
        e.preventDefault();
      }
    }
  };

  const renderPreview = () => {
    if (!bodyText) return "No content to preview.";
    const exampleData: Record<string, string> = {
      customerName: "John Doe",
      orderName: "MRS-12345",
      trackingNumber: "TRK-000111222",
      companyName: "Model Railway Scenes",
    };

    let preview = bodyText;
    for (const [k, v] of Object.entries(exampleData)) {
      preview = preview.replaceAll(`{{${k}}}`, v);
    }

    // Add signature if selected
    const signatureId = typeof signatureField === "string" 
      ? signatureField 
      : signatureField && typeof signatureField === "object" && "_link" in signatureField
      ? String((signatureField as any)._link)
      : signatureField && typeof signatureField === "object" && "id" in signatureField 
      ? String((signatureField as any).id) 
      : undefined;

    if (signatureId) {
      const signature = signatureItems.find((s) => s.id === signatureId);
      if (signature?.body) {
        preview += "\n\n" + signature.body;
      }
    }

    // Convert single newlines to <br /> tags for proper rendering
    preview = preview.replace(/\n/g, "<br />");

    return preview;
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/templates" 
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Link>

          <div className="flex items-center gap-2">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-zinc-950/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Edit Template
                {id ? (
                  <Badge variant="outline" className="bg-zinc-900/50 border-zinc-800">
                    ID: {id}
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm text-zinc-400">Name</label>
                  <Input
                    className="mt-1 bg-zinc-900/50 border-zinc-800"
                    placeholder="Template name"
                    {...register("template.name" as any)}
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Category</label>
                  <Controller
                    control={control}
                    name={"template.category" as any}
                    render={({ field }) => (
                      <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1 bg-zinc-900/50 border-zinc-800">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          {categoryOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {formatEnumValue(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Safety level</label>
                  <Controller
                    control={control}
                    name={"template.safetyLevel" as any}
                    render={({ field }) => (
                      <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1 bg-zinc-900/50 border-zinc-800">
                          <SelectValue placeholder="Select safety level" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          {safetyLevelOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {formatEnumValue(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Subject</label>
                  <Input
                    className="mt-1 bg-zinc-900/50 border-zinc-800"
                    placeholder="Email subject"
                    {...register("template.subject" as any)}
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Body</label>
                  <Controller
                    control={control}
                    name={"template.bodyText" as any}
                    render={({ field }) => (
                      <div className="mt-1 border border-zinc-800 rounded-md overflow-hidden">
                        <MDXEditor
                          ref={editorRef}
                          markdown={field.value || ""}
                          onChange={field.onChange}
                          className="dark-theme dark-editor bg-zinc-900/50 text-white min-h-[300px]"
                          contentEditableClassName="prose prose-invert max-w-none p-4"
                          plugins={[
                            headingsPlugin(),
                            listsPlugin(),
                            quotePlugin(),
                            thematicBreakPlugin(),
                            tablePlugin(),
                            toolbarPlugin({
                              toolbarContents: () => (
                                <>
                                  <UndoRedo />
                                  <BoldItalicUnderlineToggles />
                                  <BlockTypeSelect />
                                  <InsertTable />
                                  {/* Variable inserter button */}
                                  <div className="ml-2 border-l border-zinc-700 pl-2">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white transition-colors"
                                          title="Insert variable"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-4 w-4"
                                          >
                                            <text x="12" y="18" textAnchor="middle" fontSize="16" fontFamily="serif" fontStyle="italic" fill="currentColor" stroke="none">x</text>
                                            <path d="M 4 4 Q 4 2 6 2" />
                                            <path d="M 6 2 L 18 2" />
                                            <path d="M 18 2 Q 20 2 20 4" />
                                            <path d="M 4 20 Q 4 22 6 22" />
                                            <path d="M 6 22 L 18 22" />
                                            <path d="M 18 22 Q 20 22 20 20" />
                                          </svg>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                                        {availableVariables.map((v) => (
                                          <DropdownMenuItem
                                            key={v.value}
                                            onClick={() => insertVariable(v.value)}
                                            className="text-white text-sm cursor-pointer hover:bg-zinc-800"
                                          >
                                            <Code className="h-3 w-3 mr-2 text-amber-400" />
                                            {v.label}
                                            <span className="ml-auto text-xs text-zinc-500">{`{{${v.value}}}`}</span>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </>
                              ),
                            }),
                          ]}
                        />
                      </div>
                    )}
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Signature</label>
                  <Controller
                    control={control}
                    name={"template.signature" as any}
                    render={({ field }) => {
                      const signatureValue =
                        typeof field.value === "string"
                          ? field.value
                          : field.value && typeof field.value === "object" && "id" in field.value
                          ? String((field.value as any).id)
                          : undefined;

                      return (
                        <>
                          <Select
                            value={signatureValue}
                            onValueChange={(val: string) => field.onChange({ _link: val } as any)}
                          >
                            <SelectTrigger className="mt-1 bg-zinc-900/50 border-zinc-800">
                              <SelectValue placeholder="Select signature" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800">
                              {fetchingSignatures ? (
                                <SelectItem value="__loading__" disabled className="text-zinc-500 italic">
                                  Loading signatures...
                                </SelectItem>
                              ) : signatureItems.length === 0 ? (
                                <SelectItem value="__empty__" disabled className="text-zinc-500 italic">
                                  No signatures yet — create one first
                                </SelectItem>
                              ) : (
                                signatureItems.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>

                          <div className="mt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIsCreateSigOpen(true)}
                              className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              New signature
                            </button>
                            <Link
                              to="/signatures"
                              target="_blank"
                              className="text-xs text-zinc-400 hover:text-zinc-300 inline-flex items-center gap-1"
                            >
                              Manage all signatures
                            </Link>
                          </div>

                          {/* Inline Create Signature Modal */}
                          <Dialog open={isCreateSigOpen} onOpenChange={setIsCreateSigOpen}>
                            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                              <DialogHeader>
                                <DialogTitle>Create signature</DialogTitle>
                              </DialogHeader>

                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void submitSig().then((result: any) => {
                                    const newId = result?.id ?? result?.signature?.id;
                                    if (newId) {
                                      field.onChange({ _link: String(newId) } as any);
                                    }
                                  });
                                }}
                                className="space-y-4"
                              >
                                <div className="space-y-2">
                                  <label className="text-sm text-zinc-400">Name *</label>
                                  <Input
                                    className="bg-zinc-900/50 border-zinc-800"
                                    placeholder="e.g. Default"
                                    {...registerSig("signature.name")}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm text-zinc-400">Body *</label>
                                  <Textarea
                                    className="bg-zinc-900/50 border-zinc-800 min-h-[140px]"
                                    placeholder="Best regards, ..."
                                    {...registerSig("signature.body")}
                                  />
                                </div>

                                <DialogFooter className="gap-2">
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-sm rounded-md border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800"
                                    onClick={() => setIsCreateSigOpen(false)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={creatingSig}
                                    className="px-3 py-2 text-sm rounded-md bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-60"
                                  >
                                    {creatingSig ? "Saving..." : "Save signature"}
                                  </button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </>
                      );
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-black">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-zinc-900/50 border-zinc-800"
                    onClick={() => reset()}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-sm text-zinc-200 rounded-md border border-zinc-800 bg-zinc-900/20 p-4 min-h-[420px]"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Add global styles for MDXEditor dark theme
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .dark-editor {
      --color-background: rgb(24 24 27);
      --color-text: rgb(244 244 245);
      --color-border: rgb(39 39 42);
    }
    .dark-editor [role="toolbar"] {
      background: rgb(24 24 27);
      border-bottom: 1px solid rgb(39 39 42);
      padding: 0.5rem;
    }
    .dark-editor button {
      color: rgb(161 161 170);
    }
    .dark-editor button:hover {
      background: rgb(39 39 42);
      color: rgb(244 244 245);
    }
  `;
  document.head.appendChild(style);
}