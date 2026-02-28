import { ActionOptions } from "gadget-server";
import { resolveSupportSettings, shouldRecordAudit, supportSettingsSelect } from "../lib/supportSettings";
import { requireAdminUser } from "../lib/adminAccess";

function redactEmails(text: string): string {
  return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
}

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

export const run: ActionRun = async ({ api, params, session }) => {
  const actor = await requireAdminUser(api, session);

  const limit = Math.min(Math.max(Number((params as any)?.limit ?? 1000), 1), 5000);
  const format = String((params as any)?.format ?? "csv").toLowerCase();

  const config = await api.appConfiguration.findFirst({ select: supportSettingsSelect as any });
  const settings = resolveSupportSettings(config as any);
  if (!shouldRecordAudit(settings, "export")) {
    throw new Error("Audit log export is disabled by policy");
  }

  const rows = await api.actionLog.findMany({
    first: limit,
    sort: { performedAt: "Descending" } as any,
    select: {
      id: true,
      action: true,
      actionDescription: true,
      performedAt: true,
      performedBy: true,
      performedVia: true,
      success: true,
      errorMessage: true,
      metadata: true,
      conversation: { id: true, subject: true },
    } as any,
  });

  const sanitized = rows.map((row: any) => {
    const description = settings.redactAddresses ? redactEmails(String(row.actionDescription || "")) : String(row.actionDescription || "");
    const error = settings.redactAddresses ? redactEmails(String(row.errorMessage || "")) : String(row.errorMessage || "");
    const subject = settings.redactAddresses ? redactEmails(String(row.conversation?.subject || "")) : String(row.conversation?.subject || "");
    return {
      id: row.id,
      action: row.action || "",
      actionDescription: description,
      performedAt: row.performedAt ? new Date(row.performedAt).toISOString() : "",
      performedBy: row.performedBy || "",
      performedVia: row.performedVia || "",
      success: String(row.success ?? ""),
      conversationId: row.conversation?.id || "",
      conversationSubject: subject,
      errorMessage: error,
      metadata: JSON.stringify(row.metadata ?? {}),
    };
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filenameBase = `support-audit-${timestamp}`;
  let filename = `${filenameBase}.csv`;
  let mimeType = "text/csv";
  let content = "";

  if (format === "json") {
    filename = `${filenameBase}.json`;
    mimeType = "application/json";
    content = JSON.stringify({ exportedAt: new Date().toISOString(), count: sanitized.length, rows: sanitized }, null, 2);
  } else {
    const header = [
      "id",
      "action",
      "actionDescription",
      "performedAt",
      "performedBy",
      "performedVia",
      "success",
      "conversationId",
      "conversationSubject",
      "errorMessage",
      "metadata",
    ].join(",");
    const lines = sanitized.map((row) =>
      [
        row.id,
        row.action,
        row.actionDescription,
        row.performedAt,
        row.performedBy,
        row.performedVia,
        row.success,
        row.conversationId,
        row.conversationSubject,
        row.errorMessage,
        row.metadata,
      ]
        .map(csvEscape)
        .join(",")
    );
    content = [header, ...lines].join("\n");
  }

  if (shouldRecordAudit(settings, "export")) {
    await api.actionLog.create({
      action: "data_export",
      actionDescription: `Exported support audit logs (${sanitized.length} rows)`,
      performedAt: new Date(),
      performedBy: actor,
      performedVia: "web_ui",
      success: true,
      metadata: {
        kind: "support_audit_export",
        limit,
        format,
        redacted: settings.redactAddresses,
      },
    } as any);
  }

  return { success: true, filename, mimeType, content, count: sanitized.length };
};

export const params = {
  limit: { type: "number" },
  format: { type: "string" },
};

export const options: ActionOptions = {
  triggers: {
    api: true,
  },
};
