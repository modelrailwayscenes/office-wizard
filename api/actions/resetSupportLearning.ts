import { ActionOptions } from "gadget-server";
import { resolveSupportSettings, shouldRecordAudit, supportSettingsSelect } from "../lib/supportSettings";
import { requireAdminUser } from "../lib/adminAccess";

export const run: ActionRun = async ({ api, session }) => {
  const actor = await requireAdminUser(api, session);
  const config = await api.appConfiguration.findFirst({ select: supportSettingsSelect as any });
  const settings = resolveSupportSettings(config as any);

  // Clear per-conversation AI selection metadata used for tuning/learning.
  let clearedConversations = 0;
  let hasMoreConversations = true;
  while (hasMoreConversations) {
    const conversations = await api.conversation.findMany({
      first: 200,
      filter: {
        OR: [
          { playbookSelectionMetaJson: { isSet: true } },
          { selectedPlaybookConfidence: { isSet: true } },
        ],
      } as any,
      select: { id: true } as any,
    });
    if (conversations.length === 0) {
      hasMoreConversations = false;
      break;
    }
    for (const row of conversations) {
      await api.conversation.update(row.id, {
        playbookSelectionMetaJson: null,
        selectedPlaybookConfidence: null,
      } as any);
      clearedConversations++;
    }
    if (conversations.length < 200) hasMoreConversations = false;
  }

  // Remove historical triage AI comments to reset learned signal history.
  let deletedAiComments = 0;
  let hasMoreComments = true;
  while (hasMoreComments) {
    const comments = await api.aiComment.findMany({
      first: 250,
      filter: { source: { equals: "triage_ai" } } as any,
      select: { id: true } as any,
    });
    if (comments.length === 0) {
      hasMoreComments = false;
      break;
    }
    for (const row of comments) {
      await api.aiComment.delete(row.id);
      deletedAiComments++;
    }
    if (comments.length < 250) hasMoreComments = false;
  }

  if (shouldRecordAudit(settings, "config_change")) {
    await api.actionLog.create({
      action: "config_changed",
      actionDescription: "Support learning data reset",
      performedAt: new Date(),
      performedBy: actor,
      performedVia: "web_ui",
      success: true,
      metadata: {
        kind: "support_learning_reset",
        clearedConversations,
        deletedAiComments,
      },
    } as any);
  }

  return {
    success: true,
    clearedConversations,
    deletedAiComments,
  };
};

export const options: ActionOptions = {
  triggers: {
    api: true,
  },
};
