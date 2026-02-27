import { useEffect, useMemo, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Link as RouterLink, useOutletContext } from "react-router";
import { useAction, useFindFirst, useGlobalAction } from "@gadgetinc/react";
import { toast } from "sonner";

import { api } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
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
    select: {
      id: true,
      productionSchedulerEnabled: true,
      financeModuleEnabled: true,
      microsoftConnectionStatus: true,
      connectedMailbox: true,
      shopifyConnectionStatus: true,
      mondayConnectionStatus: true,
      notificationEmail: true,
      teamsWebhookUrl: true,
      emailNotificationsEnabled: true,
      notifyOnP0: true,
      notifyOnP1: true,
      notifyOnHighPriority: true,
      notifyOnNewConversation: true,
      notifyOnCustomerReply: true,
      notifyOnAutoSendFailure: true,
      dailyDigestEnabled: true,
      dailyDigestTime: true,
      debugModeEnabled: true,
      telemetryBannersEnabled: true,
      ignoreLastSyncAt: true,
    } as any,
  });
  const [{ fetching: updatingConfig }, updateConfig] = useAction(api.appConfiguration.update);
  const [{ fetching: connectingMicrosoft }, getAuthUrl] = useGlobalAction(api.getAuthUrl);
  const [{ fetching: verifyingMicrosoft }, verifyMicrosoftConnection] = useGlobalAction(api.verifyMicrosoftConnection);
  const [{ fetching: disconnectingMicrosoft }, disconnectOutlook] = useGlobalAction(api.disconnectOutlook);
  const [{ fetching: verifyingShopify }, verifyShopifyConnection] = useGlobalAction(api.verifyShopifyConnection);
  const [{ fetching: disconnectingShopify }, disconnectShopify] = useGlobalAction(api.disconnectShopify);
  const [{ fetching: verifyingMonday }, verifyMondayConnection] = useGlobalAction(api.verifyMondayConnection);
  const [{ fetching: disconnectingMonday }, disconnectMonday] = useGlobalAction(api.disconnectMonday);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState("");
  const [dailyDigestTime, setDailyDigestTime] = useState("09:00");

  useEffect(() => {
    const config = appConfig as any;
    setNotificationEmail(config?.notificationEmail || "");
    setTeamsWebhookUrl(config?.teamsWebhookUrl || "");
    setDailyDigestTime(config?.dailyDigestTime || "09:00");
  }, [appConfig]);

  const saveConfig = async (fields: Record<string, unknown>, successMessage = "Settings updated") => {
    if (!appConfig?.id) return;
    try {
      await (updateConfig as any)({ id: appConfig.id, ...fields });
      await refreshConfig();
      toast.success(successMessage);
    } catch (error) {
      toast.error(`Failed to update settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

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

  const handleConnectMicrosoft = async () => {
    try {
      const result = await getAuthUrl();
      const authUrl = (result as any)?.authUrl ?? (result as any)?.data?.authUrl;
      if (!authUrl) {
        toast.error("Could not get Microsoft authorization URL");
        return;
      }
      window.location.href = authUrl;
    } catch (error) {
      toast.error(`Microsoft connect failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleVerifyIntegration = async (
    action: () => Promise<unknown>,
    successMessage: string,
    failMessage: string
  ) => {
    try {
      await action();
      await refreshConfig();
      toast.success(successMessage);
    } catch (error) {
      toast.error(`${failMessage}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 px-6 py-8 md:px-10">
        <RefinedCard className="p-6">
          <h1 className="text-xl font-semibold text-foreground">Admin Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access Office Wizard maintenance tools.
          </p>
        </RefinedCard>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-card/30">
        <aside className="w-64 border-r border-border bg-card/60 p-4">
          <div className="px-3 pb-4">
            <h2 className="text-lg font-semibold text-foreground">Admin Settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">Support admin controls and office-level maintenance.</p>
          </div>
          <nav className="space-y-1">
            <a href="#support-admin" className="flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
              Support Admin
            </a>
            <a href="#module-flags" className="flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
              Module Feature Flags
            </a>
            <a href="#maintenance-jobs" className="flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
              Maintenance Jobs
            </a>
          </nav>
        </aside>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <RefinedCard className="p-6">
            <h1 className="text-xl font-semibold text-foreground">Office Wizard Admin Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Support-only admin pages and maintenance actions are managed from here.
            </p>
          </RefinedCard>

          <RefinedCard id="support-admin" className="p-6">
            <h2 className="text-base font-semibold text-foreground">Support Admin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The former Support Settings admin-only controls now live here.
            </p>

            <div className="mt-5 space-y-6">
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Integrations</h3>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div>Microsoft: {(appConfig as any)?.microsoftConnectionStatus || "disconnected"}</div>
                  <div>Mailbox: {(appConfig as any)?.connectedMailbox || "not connected"}</div>
                  <div>Shopify: {(appConfig as any)?.shopifyConnectionStatus || "disconnected"}</div>
                  <div>monday.com: {(appConfig as any)?.mondayConnectionStatus || "disconnected"}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleConnectMicrosoft} disabled={connectingMicrosoft}>
                    {connectingMicrosoft ? "Connecting..." : "Connect Microsoft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerifyIntegration(
                        () => verifyMicrosoftConnection() as Promise<unknown>,
                        "Microsoft connection verified",
                        "Microsoft verify failed"
                      )
                    }
                    disabled={verifyingMicrosoft}
                  >
                    {verifyingMicrosoft ? "Verifying..." : "Verify Microsoft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerifyIntegration(
                        () => disconnectOutlook() as Promise<unknown>,
                        "Microsoft disconnected",
                        "Microsoft disconnect failed"
                      )
                    }
                    disabled={disconnectingMicrosoft}
                  >
                    {disconnectingMicrosoft ? "Disconnecting..." : "Disconnect Microsoft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerifyIntegration(
                        () => verifyShopifyConnection() as Promise<unknown>,
                        "Shopify connection checked",
                        "Shopify verify failed"
                      )
                    }
                    disabled={verifyingShopify}
                  >
                    {verifyingShopify ? "Verifying..." : "Verify Shopify"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerifyIntegration(
                        () => disconnectShopify() as Promise<unknown>,
                        "Shopify disconnected",
                        "Shopify disconnect failed"
                      )
                    }
                    disabled={disconnectingShopify}
                  >
                    {disconnectingShopify ? "Disconnecting..." : "Disconnect Shopify"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerifyIntegration(
                        () => verifyMondayConnection() as Promise<unknown>,
                        "monday.com connection checked",
                        "monday.com verify failed"
                      )
                    }
                    disabled={verifyingMonday}
                  >
                    {verifyingMonday ? "Verifying..." : "Verify monday.com"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerifyIntegration(
                        () => disconnectMonday() as Promise<unknown>,
                        "monday.com disconnected",
                        "monday.com disconnect failed"
                      )
                    }
                    disabled={disconnectingMonday}
                  >
                    {disconnectingMonday ? "Disconnecting..." : "Disconnect monday.com"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Alerts & Notifications</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Email notifications</span>
                    <Switch
                      checked={Boolean((appConfig as any)?.emailNotificationsEnabled)}
                      onCheckedChange={(v) => saveConfig({ emailNotificationsEnabled: v }, "Notification setting updated")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Notify on P0</span>
                    <Switch checked={Boolean((appConfig as any)?.notifyOnP0)} onCheckedChange={(v) => saveConfig({ notifyOnP0: v })} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Notify on P1</span>
                    <Switch checked={Boolean((appConfig as any)?.notifyOnP1)} onCheckedChange={(v) => saveConfig({ notifyOnP1: v })} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Notify on high priority</span>
                    <Switch
                      checked={Boolean((appConfig as any)?.notifyOnHighPriority)}
                      onCheckedChange={(v) => saveConfig({ notifyOnHighPriority: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Notify on auto-send failure</span>
                    <Switch
                      checked={Boolean((appConfig as any)?.notifyOnAutoSendFailure)}
                      onCheckedChange={(v) => saveConfig({ notifyOnAutoSendFailure: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Notify on new conversation</span>
                    <Switch
                      checked={Boolean((appConfig as any)?.notifyOnNewConversation)}
                      onCheckedChange={(v) => saveConfig({ notifyOnNewConversation: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Notify on customer reply</span>
                    <Switch
                      checked={Boolean((appConfig as any)?.notifyOnCustomerReply)}
                      onCheckedChange={(v) => saveConfig({ notifyOnCustomerReply: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Daily digest</span>
                    <Switch checked={Boolean((appConfig as any)?.dailyDigestEnabled)} onCheckedChange={(v) => saveConfig({ dailyDigestEnabled: v })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Digest time</label>
                    <Input
                      type="time"
                      value={dailyDigestTime}
                      onChange={(e) => setDailyDigestTime(e.target.value)}
                      onBlur={() => saveConfig({ dailyDigestTime })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Escalation email</label>
                    <Input
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      onBlur={() => saveConfig({ notificationEmail })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Teams webhook URL</label>
                    <Input
                      value={teamsWebhookUrl}
                      onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                      onBlur={() => saveConfig({ teamsWebhookUrl })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Advanced Settings</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Debug mode</span>
                    <Switch checked={Boolean((appConfig as any)?.debugModeEnabled)} onCheckedChange={(v) => saveConfig({ debugModeEnabled: v })} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Telemetry banners</span>
                    <Switch
                      checked={Boolean((appConfig as any)?.telemetryBannersEnabled)}
                      onCheckedChange={(v) => saveConfig({ telemetryBannersEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">Full sync (ignore last sync)</span>
                    <Switch checked={Boolean((appConfig as any)?.ignoreLastSyncAt)} onCheckedChange={(v) => saveConfig({ ignoreLastSyncAt: v })} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost" className="px-0 text-sm text-muted-foreground hover:text-foreground">
                  <RouterLink to="/customer/support/settings/integrations">Open full Integrations page</RouterLink>
                </Button>
                <Button asChild variant="ghost" className="px-0 text-sm text-muted-foreground hover:text-foreground">
                  <RouterLink to="/customer/support/settings/alerts">Open full Alerts page</RouterLink>
                </Button>
                <Button asChild variant="ghost" className="px-0 text-sm text-muted-foreground hover:text-foreground">
                  <RouterLink to="/customer/support/settings/advanced">Open full Advanced page</RouterLink>
                </Button>
              </div>
            </div>
          </RefinedCard>

          <RefinedCard id="module-flags" className="p-6">
            <h2 className="text-base font-semibold text-foreground">Module Feature Flags</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Feature flag control for Production Scheduler and Finance modules.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleToggleProductionScheduler}
                disabled={configFetching || updatingConfig || !appConfig?.id}
              >
                {Boolean((appConfig as any)?.productionSchedulerEnabled) ? "Disable Production Scheduler" : "Enable Production Scheduler"}
              </Button>
              <Button
                variant="outline"
                onClick={handleToggleFinanceModule}
                disabled={configFetching || updatingConfig || !appConfig?.id}
              >
                {Boolean((appConfig as any)?.financeModuleEnabled) ? "Disable Finance Module" : "Enable Finance Module"}
              </Button>
            </div>
          </RefinedCard>

          <RefinedCard id="maintenance-jobs" className="p-6">
            <h2 className="text-base font-semibold text-foreground">Maintenance Jobs</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run one-off migration and repair actions when needed.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleBackfillPlaybooks} disabled={backfilling}>
                {backfilling ? "Backfilling..." : "Run Playbook Backfill"}
              </Button>
              <Button variant="outline" onClick={handleRunReplenishment} disabled={replenishing}>
                {replenishing ? "Running..." : "Run Production Replenishment"}
              </Button>
            </div>
          </RefinedCard>
        </div>
      </div>
    </div>
  );
}
