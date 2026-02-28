import type { ActionOptions } from "gadget-server";

const asArray = <T = any>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const params = {
  suggestionId: { type: "string" },
};

export const run: ActionRun = async ({ api, params: actionParams, session }) => {
  const suggestionId = String((actionParams as any)?.suggestionId || "");
  if (!suggestionId) throw new Error("suggestionId is required");

  const appConfig = await api.appConfiguration.findFirst({
    select: {
      id: true,
      plannerScheduleBlocksJson: true,
      plannerReassignSuggestionsJson: true,
      plannerFeedbackLogJson: true,
    } as any,
  });
  if (!appConfig?.id) throw new Error("App configuration not found");

  const suggestions = asArray<any>((appConfig as any)?.plannerReassignSuggestionsJson);
  const scheduleBlocks = asArray<any>((appConfig as any)?.plannerScheduleBlocksJson);
  const feedback = asArray<any>((appConfig as any)?.plannerFeedbackLogJson);

  const suggestion = suggestions.find((s) => s?.id === suggestionId);
  if (!suggestion) throw new Error("Suggestion not found");

  const updatedBlocks = scheduleBlocks.map((block) => {
    if (String(block?.taskId) !== String(suggestion.taskId)) return block;
    if (String(block?.assigneeUserId || "") !== String(suggestion.fromUserId || "")) return block;
    return {
      ...block,
      assigneeUserId: suggestion.toUserId || block.assigneeUserId,
      assigneeLabel: suggestion.toUser || block.assigneeLabel,
      explainability: {
        ...(block?.explainability || {}),
        reassignmentConfirmedAt: new Date().toISOString(),
        reassignmentReason: suggestion.reason,
      },
    };
  });

  const userRef = session?.get("user");
  const actorUserId =
    typeof userRef === "string" ? userRef : (userRef as any)?._link ?? (userRef as any)?.id ?? null;

  const nextFeedback = [
    {
      id: `feedback:${suggestionId}:${Date.now()}`,
      suggestionId,
      signal: "good",
      reason: "Confirmed reassignment",
      taskId: suggestion.taskId,
      actorUserId,
      createdAt: new Date().toISOString(),
    },
    ...feedback,
  ].slice(0, 500);

  await api.appConfiguration.update(appConfig.id, {
    plannerScheduleBlocksJson: updatedBlocks as any,
    plannerReassignSuggestionsJson: suggestions.filter((s) => s?.id !== suggestionId) as any,
    plannerFeedbackLogJson: nextFeedback as any,
  } as any);

  return { ok: true };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
