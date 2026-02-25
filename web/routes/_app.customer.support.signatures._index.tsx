import { useState } from "react";
import { useFindMany, useAction, useActionForm } from "@gadgetinc/react";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * These enums must match the Signature model schema exactly
 */
const IMPORTANCE_OPTIONS = ["High", "Normal", "Low"] as const;

const SIGNOFF_OPTIONS = [
  "Yours faithfully",
  "Yours sincerely",
  "Many thanks",
  "Best regards",
  "Regards",
] as const;

export default function SignaturesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSignature, setEditingSignature] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /**
   * Load signatures
   */
  const [{ data: signatures, fetching }, refetch] = useFindMany(api.signature, {
    select: {
      id: true,
      name: true,
      body: true,
      importance: true,
      signOff: true,
      bcc: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  /**
   * Delete action
   */
  const [{ fetching: deleting }, deleteSignature] = useAction(
    api.signature.delete
  );

  /**
   * CREATE form
   */
  const {
    register: registerCreate,
    submit: submitCreate,
    formState: { isSubmitting: isCreating },
    reset: resetCreate,
    setValue: setCreateValue,
    watch: watchCreate,
  } = useActionForm(api.signature.create, {
    onSuccess: () => {
      toast.success("Signature created successfully");
      setIsCreateOpen(false);
      resetCreate();
      void refetch();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Validation failed";
      toast.error(`Failed to create signature: ${msg}`);
    },
  });

  /**
   * UPDATE form
   */
  const {
    register: registerUpdate,
    submit: submitUpdate,
    formState: { isSubmitting: isUpdating },
    reset: resetUpdate,
    setValue: setUpdateValue,
    watch: watchUpdate,
  } = useActionForm(api.signature.update, {
    onSuccess: () => {
      toast.success("Signature updated successfully");
      setEditingSignature(null);
      resetUpdate();
      void refetch();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Validation failed";
      toast.error(`Failed to update signature: ${msg}`);
    },
  });

  /**
   * Open Edit Modal + preload values
   */
  const openEdit = (sig: any) => {
    setEditingSignature(sig);

    setUpdateValue("id", sig.id);
    setUpdateValue("signature.name", sig.name);
    setUpdateValue("signature.body", sig.body);
    setUpdateValue("signature.bcc", sig.bcc ?? "");
    setUpdateValue("signature.importance", sig.importance ?? "Normal");
    setUpdateValue("signature.signOff", sig.signOff ?? "Best regards");
  };

  /**
   * Confirm delete
   */
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteSignature({ id: deleteConfirmId });
      toast.success("Signature deleted");
      setDeleteConfirmId(null);
      void refetch();
    } catch {
      toast.error("Failed to delete signature");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 px-8 py-6">
        <h1 className="text-2xl font-semibold text-foreground">Email Signatures</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage signature templates for your emails</p>
      </div>

      <div className="px-8 pb-8">
        <div className="space-y-6">
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Signature
            </Button>
          </div>

          {/* Empty State */}
          {!fetching && (signatures?.length ?? 0) === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No signatures yet — click "New Signature" to create one.
              </p>
            </Card>
          )}

          {/* List */}
          <div className="space-y-3">
            {signatures?.map((sig: any) => (
              <Card
                key={sig.id}
                className="p-4 flex items-start justify-between"
              >
                <div>
                  <div className="font-medium">{sig.name}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {sig.body}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(sig)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setDeleteConfirmId(sig.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE DRAWER */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Signature</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCreate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input {...registerCreate("signature.name")} />
            </div>

            <div>
              <Label>Body</Label>
              <Textarea
                rows={6}
                {...registerCreate("signature.body")}
              />
            </div>

            <div>
              <Label>Importance</Label>
              <Select
                value={watchCreate("signature.importance") ?? "Normal"}
                onValueChange={(v: string) =>
                  setCreateValue("signature.importance", v as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sign Off</Label>
              <Select
                value={watchCreate("signature.signOff") ?? "Best regards"}
                onValueChange={(v: string) =>
                  setCreateValue("signature.signOff", v as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNOFF_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SheetFooter>
              <Button
                type="submit"
                disabled={isCreating}
              >
                Save
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* EDIT DRAWER */}
      <Sheet open={!!editingSignature} onOpenChange={(open) => !open && setEditingSignature(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Signature</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitUpdate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input {...registerUpdate("signature.name")} />
            </div>

            <div>
              <Label>Body</Label>
              <Textarea rows={6} {...registerUpdate("signature.body")} />
            </div>

            <SheetFooter>
              <Button
                type="submit"
                disabled={isUpdating}
              >
                Update
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* DELETE CONFIRM */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signature?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
