import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ logger, api }) => {
  logger.info("Starting conversation rebuild — hard reset");

  // STEP 1: Delete ALL existing conversations (makes rebuild idempotent)
  let totalDeleted = 0;
  while (true) {
    const existing = await api.conversation.findMany({
      select: { id: true },
      first: 50,
    });
    if (existing.length === 0) break;
    for (const conv of existing) {
      try {
        await api.conversation.delete(conv.id);
        totalDeleted++;
      } catch (err: any) {
        logger.warn({ id: conv.id, error: err.message }, "Failed to delete conversation");
      }
    }
    if (totalDeleted >= 500) break; // safety valve
  }
  logger.info({ totalDeleted }, "Deleted existing conversations");

  // STEP 2: Fetch all email messages
  const messages = await api.emailMessage.findMany({
    select: {
      id: true,
      conversationId: true,
      subject: true,
      fromAddress: true,
      fromName: true,
      receivedDateTime: true,
      sentDateTime: true,
      isRead: true,
      folderPath: true,
    },
    first: 250,
  });

  logger.info({ count: messages.length }, "Found email messages");

  // STEP 3: Group by Microsoft conversationId (thread)
  type MessageRecord = (typeof messages)[number];
  const conversationMap = new Map<string, MessageRecord[]>();
  for (const msg of messages) {
    const convId = msg.conversationId || msg.id;
    if (!conversationMap.has(convId)) conversationMap.set(convId, []);
    conversationMap.get(convId)!.push(msg);
  }
  logger.info({ groups: conversationMap.size }, "Grouped into threads");

  let created = 0;
  let errors = 0;

  // STEP 4: Create one conversation per thread
  for (const [convId, convMessages] of conversationMap.entries()) {
    try {
      const sorted = [...convMessages].sort((a, b) => {
        const aDate = a.receivedDateTime ? new Date(a.receivedDateTime).getTime() : 0;
        const bDate = b.receivedDateTime ? new Date(b.receivedDateTime).getTime() : 0;
        return aDate - bDate;
      });

      const firstMsg = sorted[0];
      const latestMsg = sorted[sorted.length - 1];

      const conversation = await api.conversation.create({
        conversationId: convId,
        subject: firstMsg.subject || "(No subject)",
        primaryCustomerEmail: firstMsg.fromAddress,
        primaryCustomerName: firstMsg.fromName,
        status: "new",
        firstMessageAt: firstMsg.receivedDateTime || firstMsg.sentDateTime,
        latestMessageAt: latestMsg.receivedDateTime || latestMsg.sentDateTime,
        messageCount: sorted.length,
        unreadCount: sorted.filter(m => !m.isRead).length,
        folderPath: firstMsg.folderPath,
      } as any);

      for (const msg of convMessages) {
        await api.emailMessage.update(msg.id, {
          conversation: { _link: conversation.id },
        } as any);
      }

      logger.info({ convId, messageCount: sorted.length }, "Created conversation");
      created++;
    } catch (err: any) {
      logger.error({ convId, error: err.message }, "Failed to create conversation");
      errors++;
    }
  }

  const summary = { success: true, created, deleted: totalDeleted, errors };
  logger.info(summary, "Rebuild complete");
  return summary;
};

export const options: ActionOptions = {
  timeoutMS: 300000,
  triggers: { api: true },
};
