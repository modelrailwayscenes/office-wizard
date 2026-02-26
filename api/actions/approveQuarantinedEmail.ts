import type { ActionOptions } from "gadget-server";

// ---------------------------------------------------------------------------
// approveQuarantinedEmail
//
// Promotes an emailQuarantine record into the main emailMessage + conversation
// flow, exactly as if it had passed the sync filter originally.
//
// Params:
//   quarantineId   — the ID of the emailQuarantine record to approve
//   addSenderToAllowlist — (optional) permanently whitelist this sender
// ---------------------------------------------------------------------------

export const run: ActionRun = async ({ logger, api, params }) => {
  const { quarantineId, addSenderToAllowlist = false, approvalReason } = params as any;

  if (!quarantineId) throw new Error("quarantineId is required");

  // ── Load quarantine record ────────────────────────────────────────────────
  const qRecords = await api.emailQuarantine.findMany({
    filter: { id: { equals: quarantineId } },
    select: {
      id: true,
      providerMessageId: true,
      fromAddress: true,
      fromName: true,
      subject: true,
      bodyPreview: true,
      receivedAt: true,
      status: true,
    },
    first: 1,
  });

  const q = qRecords[0];
  if (!q) throw new Error(`Quarantine record ${quarantineId} not found`);
  if (q.status === "approved") {
    logger.info({ quarantineId }, "Already approved, skipping");
    return { success: true, alreadyApproved: true };
  }

  // ── Check for duplicate emailMessage ─────────────────────────────────────
  const existingMsg = await api.emailMessage.findMany({
    filter: { messageId: { equals: q.providerMessageId } },
    select: { id: true },
    first: 1,
  });

  let emailMessageId: string;

  if (existingMsg.length > 0) {
    emailMessageId = existingMsg[0].id;
    logger.info({ emailMessageId }, "emailMessage already exists, linking to conversation");
  } else {
    // ── Create emailMessage ─────────────────────────────────────────────────
    const emailMessage = await api.emailMessage.create({
      messageId: q.providerMessageId,
      conversationId: q.providerMessageId, // no thread ID available; treat as own thread
      subject: q.subject || "(No subject)",
      bodyPreview: q.bodyPreview || "",
      fromAddress: q.fromAddress,
      fromName: q.fromName,
      receivedDateTime: q.receivedAt ? new Date(q.receivedAt) : new Date(),
      isRead: false,
      hasAttachments: false,
      importance: "normal",
      classificationReason: "manually approved from quarantine",
    } as any);

    emailMessageId = emailMessage.id;
    logger.info({ emailMessageId }, "Created emailMessage from quarantine");
  }

  // ── Find or create conversation ───────────────────────────────────────────
  const convId = q.providerMessageId;

  const existingConv = await api.conversation.findMany({
    filter: { conversationId: { equals: convId } },
    select: { id: true, messageCount: true },
    first: 1,
  });

  if (existingConv.length > 0) {
    await api.conversation.update(existingConv[0].id, {
      messageCount: (existingConv[0].messageCount || 0) + 1,
      unreadCount: 1,
      latestMessageAt: q.receivedAt ? new Date(q.receivedAt) : new Date(),
    } as any);
    await api.emailMessage.update(emailMessageId, { conversation: { _link: existingConv[0].id } } as any);
    logger.info({ conversationId: existingConv[0].id }, "Linked to existing conversation");
  } else {
    const conversation = await api.conversation.create({
      conversationId: convId,
      subject: q.subject || "(No subject)",
      primaryCustomerEmail: q.fromAddress,
      primaryCustomerName: q.fromName,
      status: "new",
      firstMessageAt: q.receivedAt ? new Date(q.receivedAt) : new Date(),
      latestMessageAt: q.receivedAt ? new Date(q.receivedAt) : new Date(),
      messageCount: 1,
      unreadCount: 1,
    } as any);
    await api.emailMessage.update(emailMessageId, { conversation: { _link: conversation.id } } as any);
    logger.info({ conversationId: conversation.id }, "Created new conversation from quarantine");
  }

  // ── Mark quarantine record as approved ───────────────────────────────────
  await api.emailQuarantine.update(quarantineId, {
    status: "approved",
    approvedAt: new Date(),
    classificationReason: approvalReason
      ? `approved: ${String(approvalReason).trim()}`
      : undefined,
  } as any);

  // ── Optionally allowlist the sender ──────────────────────────────────────
  // Adds sender to appConfiguration.allowedSenders so future syncs auto-import
  if (addSenderToAllowlist && q.fromAddress) {
    try {
      const config = await api.appConfiguration.findFirst({
        select: { id: true, allowedSenders: true },
      });
      if (config) {
        const existing: string[] = (config as any).allowedSenders || [];
        if (!existing.includes(q.fromAddress)) {
          await api.appConfiguration.update(config.id, {
            allowedSenders: [...existing, q.fromAddress],
          } as any);
          logger.info({ sender: q.fromAddress }, "Added sender to allowlist");
        }
      }
    } catch (err: any) {
      // Non-fatal — allowlist field may not exist yet
      logger.warn({ err: err.message }, "Could not update allowedSenders — field may not exist yet");
    }
  }

  return {
    success: true,
    emailMessageId,
    senderAllowlisted: addSenderToAllowlist && !!q.fromAddress,
  };
};

export const params = {
  quarantineId: { type: "string" },
  addSenderToAllowlist: { type: "boolean" },
  approvalReason: { type: "string" },
};

export const options: ActionOptions = {
  timeoutMS: 60000,
  triggers: { api: true },
};
