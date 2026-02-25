// components/SidebarBrandHeader.tsx
import type { LucideIcon } from "lucide-react";

interface SidebarBrandHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  overline?: string;
}

export function SidebarBrandHeader({ icon: Icon, title, subtitle, overline }: SidebarBrandHeaderProps) {
  return (
    <div className="mb-6 px-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-teal-400" />
      </div>
      <div>
        {overline ? (
          <>
            <p className="text-xs text-muted-foreground">{overline}</p>
            <h2 className="text-lg font-semibold text-foreground leading-tight">{title}</h2>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
}
