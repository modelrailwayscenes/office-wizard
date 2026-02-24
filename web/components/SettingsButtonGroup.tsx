// components/SettingsButtonGroup.tsx
import { Button } from "@/components/ui/button";

interface SettingsButtonGroupProps {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  disabled?: boolean;
}

export function SettingsButtonGroup({
  onSave,
  onCancel,
  saving = false,
  disabled = false,
}: SettingsButtonGroupProps) {
  return (
    <div className="flex items-center gap-3">
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
        className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}