import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, ArrowRight } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

type SearchItem = {
  id: string;
  label: string;
  description?: string;
  group: string;
  path: string;
};

export function GlobalSearchOverlay({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, SearchItem[]>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-3 rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Global Search" description="Search modules and common routes">
        <CommandInput placeholder="Search modules, routes, and tools..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(grouped).map(([group, groupItems]) => (
            <CommandGroup key={group} heading={group}>
              {groupItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.description ?? ""}`}
                  onSelect={() => {
                    navigate(item.path);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">
                    <span className="block text-sm">{item.label}</span>
                    {item.description ? <span className="block text-xs text-muted-foreground">{item.description}</span> : null}
                  </span>
                  <CommandShortcut>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
