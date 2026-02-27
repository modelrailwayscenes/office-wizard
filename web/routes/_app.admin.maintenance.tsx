import { useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useOutletContext } from "react-router";
import { useAction, useFindFirst, useGlobalAction } from "@gadgetinc/react";
import { toast } from "sonner";

import { api } from "../api";
import { Button } from "../components/ui/button";
import { RefinedCard } from "../components/RefinedCard";
import type { AuthOutletContext } from "./_app";

export async function loader({ request }: LoaderFunctionArgs) {
  return { from: request.url };
}

function isAdminRole(user: AuthOutletContext["user"]) {
  const roleKeys = Array.isArray((user as any)?.roleList)
    ? ((user as any).roleList as Array<string | { key?: string }>)
        .map((role) => (typeof role === "string" ? role : role?.key))
        .filter((role): role is string => Boolean(role))
    : [];

  return roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
}

export default function AdminMaintenancePage() {
  const { user } = useOutletContext<AuthOutletContext>();
  const isAdmin = useMemo(() => isAdminRole(user), [user]);
  const [{ fetching: backfilling }, backfillPlaybooks] = useGlobalAction(api.backfillPlaybooks);
  const [{ fetching: replenishing }, runProductionReplenishment] = useGlobalAction(api.runProductionReplenishment);
  const [{ data: appConfig, fetching: configFetching }, refreshConfig] = useFindFirst(api.appConfiguration, {
    select: { id: true, productionSchedulerEnabled: true, financeModuleEnabled: true } as any,
  });
  const [{ fetching: updatingConfig }, updateConfig] = useAction(api.appConfiguration.update);

  const handleBackfillPlaybooks = async () => {
    try {
      const dryRun = (await backfillPlaybooks({ dryRun: true, first: 1000 })) as
        | { scanned?: number; updated?: number }
        | undefined;
      const scanned = dryRun?.scanned ?? 0;
      const updateCount = dryRun?.updated ?? 0;

      if (updateCount === 0) {
        toast.success(`No backfill needed. Checked ${scanned} playbooks.`);
        return;
      }

      const proceed = window.confirm(
        `Backfill will update ${updateCount} of ${scanned} playbooks with missing baseline guidance fields. Continue?`
      );
      if (!proceed) return;

      const result = (await backfillPlaybooks({ dryRun: false, first: 1000 })) as
        | { updated?: number; scanned?: number }
        | undefined;
      toast.success(`Backfill complete: ${result?.updated ?? 0} updated (scanned ${result?.scanned ?? 0}).`);
    } catch (error) {
      toast.error(`Backfill failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleToggleProductionScheduler = async () => {
    if (!appConfig?.id) return;
    try {
      await (updateConfig as any)({
        id: appConfig.id,
        productionSchedulerEnabled: !Boolean((appConfig as any).productionSchedulerEnabled),
      });
      await refreshConfig();
      toast.success("Production scheduler feature flag updated");
    } catch (error) {
      toast.error(`Failed to update flag: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleToggleFinanceModule = async () => {
    if (!appConfig?.id) return;
    try {
      await (updateConfig as any)({
        id: appConfig.id,
        financeModuleEnabled: !Boolean((appConfig as any).financeModuleEnabled),
      });
      await refreshConfig();
      toast.success("Finance module feature flag updated");
    } catch (error) {
      toast.error(`Failed to update flag: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleRunReplenishment = async () => {
    try {
      const dryRun = (await runProductionReplenishment({ dryRun: true })) as any;
      const proceed = window.confirm(
        `Dry run: ${dryRun?.actions?.length ?? 0} SKU checks, ${dryRun?.created ?? 0} create/upsert, ${dryRun?.closed ?? 0} close. Run live now?`
      );
      if (!proceed) return;
      const result = (await runProductionReplenishment({ dryRun: false })) as any;
      toast.success(`Replenishment complete: ${result?.created ?? 0} created, ${result?.closed ?? 0} closed.`);
    } catch (error) {
      toast.error(`Replenishment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 px-6 py-8 md:px-10">
        <RefinedCard className="p-6">
          <h1 className="text-xl font-semibold text-foreground">Admin Maintenance</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access Office Wizard maintenance tools.
          </p>
        </RefinedCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <RefinedCard className="p-6">
        <h1 className="text-xl font-semibold text-foreground">Office Wizard Admin Maintenance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One-off migration and repair actions are managed here and kept out of day-to-day module pages.
        </p>
      </RefinedCard>

      <RefinedCard className="p-6">
        <h2 className="text-base font-semibold text-foreground">Playbook Tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Run backfill only if you need to repair missing playbook fields after imports or manual data operations.
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={handleBackfillPlaybooks} disabled={backfilling}>
            {backfilling ? "Backfilling..." : "Run Playbook Backfill"}
          </Button>
        </div>
      </RefinedCard>

      <RefinedCard className="p-6">
        <h2 className="text-base font-semibold text-foreground">Production Scheduler</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Feature flag control and replenishment maintenance actions for the Production module.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handleToggleProductionScheduler}
            disabled={configFetching || updatingConfig || !appConfig?.id}
          >
            {Boolean((appConfig as any)?.productionSchedulerEnabled) ? "Disable Production Scheduler" : "Enable Production Scheduler"}
          </Button>
          <Button variant="outline" onClick={handleRunReplenishment} disabled={replenishing}>
            {replenishing ? "Running..." : "Run Production Replenishment"}
          </Button>
        </div>
      </RefinedCard>

      <RefinedCard className="p-6">
        <h2 className="text-base font-semibold text-foreground">Finance Module</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Feature flag control for the Finance module visibility in Office Wizard.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handleToggleFinanceModule}
            disabled={configFetching || updatingConfig || !appConfig?.id}
          >
            {Boolean((appConfig as any)?.financeModuleEnabled) ? "Disable Finance Module" : "Enable Finance Module"}
          </Button>
        </div>
      </RefinedCard>
    </div>
  );
}
