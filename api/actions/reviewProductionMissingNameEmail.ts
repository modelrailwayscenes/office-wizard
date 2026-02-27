import type { ActionOptions } from "gadget-server";
import { getMicrosoftGraphClient, sendEmail as sendGraphEmail } from "../lib/microsoftGraph";

export const params = {
  productionJobId: { type: "string" },
  decision: { type: "string" }, // approve | reject
  subject: { type: "string" },
  body: { type: "string" },
};

const parseNotes = (raw: unknown): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return {};
  }
};

const recipientFromNotes = (notes: Record<string, any>): string => {
  return String(
    notes?.customerEmail ||
      notes?.webhook?.customerEmail ||
      notes?.webhook?.orderEmail ||
      notes?.order?.customerEmail ||
      ""
  ).trim();
};

export const run: ActionRun = async ({ params, api, session }) => {
  const productionJobId = String(params?.productionJobId || "").trim();
  const decision = String(params?.decision || "").trim().toLowerCase();
  if (!productionJobId) throw new Error("productionJobId is required");
  if (!["approve", "reject"].includes(decision)) throw new Error("decision must be approve or reject");

  const userRef = session?.get("user");
  const actorUserId = typeof userRef === "string" ? userRef : userRef?._link || userRef?.id || null;

  const job = await api.productionJob.findOne(productionJobId, {
    select: {
      id: true,
      orderNumber: true,
      source: true,
      notes: true,
      status: true,
    },
  });
  if (!job) throw new Error("Production job not found");

  const currentNotes = parseNotes(job.notes);
  const toEmail = recipientFromNotes(currentNotes);
  if (!toEmail) throw new Error("No customer email found for this job");

  const existingWorkflow = currentNotes.emailWorkflow || {};
  const subject =
    String(params?.subject || "").trim() ||
    String(existingWorkflow?.draftSubject || "").trim() ||
    `Action needed: station name required for order ${job.orderNumber || ""}`.trim();
  const body = String(params?.body || "").trim() || String(existingWorkflow?.draftBody || "").trim();

  if (decision === "reject") {
    const nextNotes = {
      ...currentNotes,
      emailWorkflow: {
        ...existingWorkflow,
        reason: "missing_station_name",
        status: "rejected",
        draftSubject: subject,
        draftBody: body,
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: actorUserId || null,
      },
    };
    await api.productionJob.update({
      id: job.id,
      notes: JSON.stringify(nextNotes, null, 2),
      actorUserId,
    });
    return { ok: true, decision, sent: false };
  }

  if (!body) throw new Error("Email body is required before approval and send");

  const appConfig = await api.appConfiguration.findFirst({
    select: {
      id: true,
      microsoftAccessToken: true,
      microsoftTokenExpiresAt: true,
      microsoftConnectionStatus: true,
    },
  });

  if ((appConfig as any)?.microsoftConnectionStatus !== "connected") {
    throw new Error("Microsoft 365 is not connected");
  }

  let accessToken = String((appConfig as any)?.microsoftAccessToken || "");
  const tokenExpiry = (appConfig as any)?.microsoftTokenExpiresAt
    ? new Date((appConfig as any).microsoftTokenExpiresAt).getTime()
    : 0;

  if (!accessToken || !Number.isFinite(tokenExpiry) || tokenExpiry < Date.now() + 60_000) {
    const refreshed = await api.refreshAccessToken();
    if (!refreshed?.success) {
      throw new Error(refreshed?.error || "Unable to refresh Microsoft access token");
    }
    const configAfterRefresh = await api.appConfiguration.findFirst({
      select: { microsoftAccessToken: true },
    });
    accessToken = String((configAfterRefresh as any)?.microsoftAccessToken || "");
  }

  if (!accessToken) throw new Error("Microsoft access token is missing");

  const graphClient = getMicrosoftGraphClient(accessToken);
  await sendGraphEmail(graphClient, {
    subject,
    body,
    toRecipients: [{ address: toEmail }],
  });

  const nextNotes = {
    ...currentNotes,
    customerEmail: toEmail,
    emailWorkflow: {
      ...existingWorkflow,
      reason: "missing_station_name",
      status: "sent",
      draftSubject: subject,
      draftBody: body,
      sentAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: actorUserId || null,
    },
  };

  await api.productionJob.update({
    id: job.id,
    notes: JSON.stringify(nextNotes, null, 2),
    actorUserId,
  });

  return { ok: true, decision, sent: true, toEmail, subject };
};

export const options: ActionOptions = {};
