import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ModuleItem = {
  id: string;
  label: string;
  path: string;
};

export function RefinedModuleSwitcher({
  modules,
  activeModuleId,
  onSelect,
}: {
  modules: ModuleItem[];
  activeModuleId?: string;
  onSelect: (module: ModuleItem) => void;
}) {
  const activeModule = modules.find((item) => item.id === activeModuleId) ?? modules[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-44 justify-between">
          <span className="tracking-wide">{activeModule?.label ?? "Select module"}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch module</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modules.map((module) => (
          <DropdownMenuItem key={module.id} onSelect={() => onSelect(module)} className="cursor-pointer">
            <span className="flex w-full items-center justify-between gap-3">
              <span>{module.label}</span>
              {module.id === activeModule?.id ? <Check className="h-4 w-4 text-primary" /> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
