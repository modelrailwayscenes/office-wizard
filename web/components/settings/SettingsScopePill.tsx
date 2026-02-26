type SettingsScope = "global" | "module" | "override" | "personal" | "admin";

const scopeStyles: Record<SettingsScope, string> = {
  global: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  module: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  override: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  personal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  admin: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const scopeLabels: Record<SettingsScope, string> = {
  global: "Global",
  module: "Module",
  override: "Override",
  personal: "Personal",
  admin: "Admin",
};

export function SettingsScopePill({ scope }: { scope: SettingsScope }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${scopeStyles[scope]}`}
    >
      {scopeLabels[scope]}
    </span>
  );
}
