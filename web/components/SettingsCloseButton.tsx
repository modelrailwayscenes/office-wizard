import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STORAGE_KEY = "ow:lastNonSettingsPath";

function getLastNonSettingsPath() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function SettingsCloseButton({
  className = "",
  label = "Close settings",
}: {
  className?: string;
  label?: string;
}) {
  const navigate = useNavigate();

  const handleClose = () => {
    const target = getLastNonSettingsPath() || "/";
    navigate(target);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClose}
      className={className}
      title={label}
      aria-label={label}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
