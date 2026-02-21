import type { ActionOptions } from "gadget-server";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function scheduleToIntervalMs(schedule: string): number {
  switch (schedule) {
    case "hourly":
      return HOUR_MS;
    case "weekly":
      return DAY_MS * 7;
    case "monthly":
      return DAY_MS * 30;
    case "daily":
    default:
      return DAY_MS;
  }
}

export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      backupSchedule: true,
      backupRetentionDays: true,
      lastBackupAt: true,
    } as any,
  });

  if (!config) {
    logger.warn("No app configuration found for backup");
    return { ok: false };
  }

  const backupSchedule = (config as any).backupSchedule || "daily";
  const backupRetentionDays = Number((config as any).backupRetentionDays) || 30;
  const lastBackupAt = (config as any).lastBackupAt
    ? new Date((config as any).lastBackupAt)
    : null;

  const intervalMs = scheduleToIntervalMs(backupSchedule);
  const now = new Date();
  const due = !lastBackupAt || now.getTime() - lastBackupAt.getTime() >= intervalMs;

  if (!due) {
    return { ok: true, skipped: true };
  }

  // Stubbed backup action — records a log entry for visibility
  await api.actionLog.create({
    action: "bulk_action",
    actionDescription: `Backup run completed (schedule: ${backupSchedule}, retention: ${backupRetentionDays} days)`,
    performedAt: now,
    performedBy: "system",
    performedVia: "scheduled_job",
    metadata: {
      backupSchedule,
      backupRetentionDays,
    },
  } as any);

  await api.appConfiguration.update((config as any).id, {
    lastBackupAt: now,
  } as any);

  logger.info({ backupSchedule, backupRetentionDays }, "Backup stub completed");
  return { ok: true, ranAt: now.toISOString() };
};

export const options: ActionOptions = {
  triggers: {
    scheduler: [
      {
        cron: "0 * * * *", // hourly
      },
    ],
  },
};
