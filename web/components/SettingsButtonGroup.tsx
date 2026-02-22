// components/SettingsButtonGroup.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsButtonGroupProps {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  disabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteConfirmMessage?: string;
  deleting?: boolean;
}

export function SettingsButtonGroup({
  onSave,
  onCancel,
  saving = false,
  disabled = false,
  onDelete,
  deleteLabel = "Delete",
  deleteConfirmMessage = "Are you sure you want to delete this record?",
  deleting = false,
}: SettingsButtonGroupProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    setIsDialogOpen(false);
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className="flex items-center gap-3 w-full">
      {onDelete && (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={saving || disabled || deleting}
              className="mr-auto bg-slate-700/50 hover:bg-red-900/20 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? "Deleting..." : deleteLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={saving || disabled}
        className="border-slate-700 hover:bg-slate-800"
      >
        Cancel
      </Button>
      <Button
        onClick={onSave}
        disabled={saving || disabled}
        className="bg-teal-500 hover:bg-teal-600 text-white font-medium"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
