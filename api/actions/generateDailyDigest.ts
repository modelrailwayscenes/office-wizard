import type { ActionOptions } from "gadget-server";

function parseTime(value: string): { hours: number; minutes: number } | null {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
}

export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      dailyDigestEnabled: true,
      dailyDigestTime: true,
      lastDailyDigestAt: true,
    } as any,
  });

  if (!config) {
    logger.warn("No app configuration found for daily digest");
    return { ok: false };
  }

  if (!(config as any).dailyDigestEnabled) {
    return { ok: true, skipped: true };
  }

  const timeConfig = parseTime((config as any).dailyDigestTime || "09:00");
  if (!timeConfig) {
    logger.warn("Invalid dailyDigestTime, skipping digest");
    return { ok: false };
  }

  const now = new Date();
  const todayTarget = new Date(now);
  todayTarget.setHours(timeConfig.hours, timeConfig.minutes, 0, 0);

  const lastDigestAt = (config as any).lastDailyDigestAt
    ? new Date((config as any).lastDailyDigestAt)
    : null;

  const due =
    now >= todayTarget &&
    (!lastDigestAt || lastDigestAt < todayTarget);

  if (!due) {
    return { ok: true, skipped: true };
  }

  await api.actionLog.create({
    action: "bulk_action",
    actionDescription: "Daily digest generated",
    performedAt: now,
    performedBy: "system",
    performedVia: "scheduled_job",
    metadata: {
      dailyDigestTime: (config as any).dailyDigestTime,
    },
  } as any);

  await api.appConfiguration.update((config as any).id, {
    lastDailyDigestAt: now,
  } as any);

  logger.info("Daily digest generated");
  return { ok: true, ranAt: now.toISOString() };
};

export const options: ActionOptions = {
  triggers: {
    scheduler: [
      {
        cron: "*/15 * * * *", // check every 15 minutes
      },
    ],
  },
};
