export function ListSectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
      </div>
      {typeof count === "number" ? (
        <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}
