import type { ActionOptions } from "gadget-server";

export const params = {
  productionJobId: { type: "string" },
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
  if (!productionJobId) throw new Error("productionJobId is required");

  const userRef = session?.get("user");
  const actorUserId = typeof userRef === "string" ? userRef : userRef?._link || userRef?.id || null;

  const job = await api.productionJob.findOne(productionJobId, {
    select: {
      id: true,
      orderNumber: true,
      source: true,
      productName: true,
      stationOrText: true,
      notes: true,
      status: true,
    },
  });
  if (!job) throw new Error("Production job not found");
  if (job.source !== "shopify_order") throw new Error("Draft generation only applies to Shopify order jobs");
  if (String(job.stationOrText || "").trim()) throw new Error("Station name already present; no missing-name email required");

  const currentNotes = parseNotes(job.notes);
  const toEmail = recipientFromNotes(currentNotes);
  if (!toEmail) {
    throw new Error("No customer email found for this job; cannot draft outbound message");
  }

  const subject = `Action needed: station name required for order ${job.orderNumber || ""}`.trim();
  const body = [
    `<p>Hi there,</p>`,
    `<p>Thanks for your order${job.orderNumber ? ` <strong>${job.orderNumber}</strong>` : ""}. We are ready to produce your station sign, but the station name/text was not included.</p>`,
    `<p>Please reply with the exact station name you want on the sign, including spelling and punctuation.</p>`,
    `<p>As soon as we receive this, we will continue production.</p>`,
    `<p>Kind regards,<br/>Model Railway Scenes</p>`,
  ].join("");

  const nextNotes = {
    ...currentNotes,
    customerEmail: toEmail,
    emailWorkflow: {
      ...(currentNotes.emailWorkflow || {}),
      reason: "missing_station_name",
      status: "drafted",
      draftSubject: subject,
      draftBody: body,
      queuedAt: new Date().toISOString(),
      queuedByUserId: actorUserId || null,
    },
  };

  await api.productionJob.update({
    id: job.id,
    status: "on_hold",
    notes: JSON.stringify(nextNotes, null, 2),
    actorUserId,
  });

  return {
    ok: true,
    productionJobId: job.id,
    toEmail,
    subject,
    body,
    status: "drafted",
  };
};

export const options: ActionOptions = {};
