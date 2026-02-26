import { useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useOutletContext } from "react-router";
import { useGlobalAction } from "@gadgetinc/react";
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
    </div>
  );
}
