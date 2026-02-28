import type { ActionOptions } from "gadget-server";
import { resolveSupportSettings, supportSettingsSelect } from "../lib/supportSettings";

const DAY_MS = 24 * 60 * 60 * 1000;

export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({ select: supportSettingsSelect as any });

  if (!config) {
    logger.warn("No app configuration found for retention policy");
    return { ok: false };
  }

  const settings = resolveSupportSettings(config as any);
  const retentionDays = settings.retentionDays;
  const auditLogRetentionDays = settings.auditLogRetentionDays;
  const autoArchiveEnabled = settings.autoArchiveEnabled;
  const deleteArchivedData = settings.deleteArchivedData;

  const now = new Date();
  const archiveCutoff = new Date(now.getTime() - retentionDays * DAY_MS).toISOString();
  const auditCutoff = new Date(now.getTime() - auditLogRetentionDays * DAY_MS).toISOString();

  let archivedCount = 0;
  let deletedCount = 0;
  let auditDeleted = 0;

  if (autoArchiveEnabled) {
    let hasMore = true;
    while (hasMore) {
      const conversations = await api.conversation.findMany({
        first: 200,
        filter: {
          latestMessageAt: { lessThan: archiveCutoff },
          archivedAt: { isSet: false },
        } as any,
        select: { id: true } as any,
      });

      if (conversations.length === 0) {
        hasMore = false;
        break;
      }

      for (const conversation of conversations) {
        await api.conversation.update(conversation.id, {
          archivedAt: now,
          status: "archived",
        } as any);
        archivedCount++;
      }

      if (conversations.length < 200) hasMore = false;
    }
  }

  if (deleteArchivedData) {
    let hasMore = true;
    while (hasMore) {
      const conversations = await api.conversation.findMany({
        first: 100,
        filter: {
          archivedAt: { lessThan: archiveCutoff },
        } as any,
        select: { id: true } as any,
      });

      if (conversations.length === 0) {
        hasMore = false;
        break;
      }

      for (const conversation of conversations) {
        await api.conversation.delete(conversation.id);
        deletedCount++;
      }

      if (conversations.length < 100) hasMore = false;
    }
  }

  // Audit log cleanup
  let hasMoreLogs = true;
  while (hasMoreLogs) {
    const logs = await api.actionLog.findMany({
      first: 250,
      filter: { performedAt: { lessThan: auditCutoff } } as any,
      select: { id: true } as any,
    });

    if (logs.length === 0) {
      hasMoreLogs = false;
      break;
    }

    for (const log of logs) {
      await api.actionLog.delete(log.id);
      auditDeleted++;
    }

    if (logs.length < 250) hasMoreLogs = false;
  }

  logger.info(
    { archivedCount, deletedCount, auditDeleted },
    "Retention policy enforcement complete"
  );

  return { ok: true, archivedCount, deletedCount, auditDeleted };
};

export const options: ActionOptions = {
  triggers: {
    scheduler: [
      {
        cron: "15 2 * * *", // daily at 02:15
      },
    ],
  },
};
