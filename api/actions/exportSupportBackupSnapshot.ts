import { ActionOptions } from "gadget-server";
import { resolveSupportSettings, shouldRecordAudit, supportSettingsSelect } from "../lib/supportSettings";
import { requireAdminUser } from "../lib/adminAccess";

export const run: ActionRun = async ({ api, session }) => {
  const actor = await requireAdminUser(api, session);

  const config = await api.appConfiguration.findFirst({ select: { ...supportSettingsSelect, id: true, lastBackupAt: true } as any });
  if (!config) throw new Error("App configuration not found");
  const settings = resolveSupportSettings(config as any);

  const [conversationCount, emailCount, actionLogCount, userCount] = await Promise.all([
    api.conversation.findMany({ first: 1, select: { id: true } as any }).then((rows: any[]) => rows.length),
    api.emailMessage.findMany({ first: 1, select: { id: true } as any }).then((rows: any[]) => rows.length),
    api.actionLog.findMany({ first: 1, select: { id: true } as any }).then((rows: any[]) => rows.length),
    api.user.findMany({ first: 1, select: { id: true } as any }).then((rows: any[]) => rows.length),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    policy: {
      backupSchedule: settings.backupSchedule,
      backupRetentionDays: settings.backupRetentionDays,
      lastBackupAt: (config as any).lastBackupAt || null,
      retentionDays: settings.retentionDays,
      auditLogRetentionDays: settings.auditLogRetentionDays,
    },
    counts: {
      conversations: conversationCount,
      emailMessages: emailCount,
      actionLogs: actionLogCount,
      users: userCount,
    },
  };

  if (shouldRecordAudit(settings, "export")) {
    await api.actionLog.create({
      action: "data_export",
      actionDescription: "Exported support backup snapshot",
      performedAt: new Date(),
      performedBy: actor,
      performedVia: "web_ui",
      success: true,
      metadata: {
        kind: "support_backup_snapshot",
        counts: snapshot.counts,
      },
    } as any);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    success: true,
    filename: `support-backup-snapshot-${timestamp}.json`,
    mimeType: "application/json",
    content: JSON.stringify(snapshot, null, 2),
  };
};

export const options: ActionOptions = {
  triggers: {
    api: true,
  },
};
