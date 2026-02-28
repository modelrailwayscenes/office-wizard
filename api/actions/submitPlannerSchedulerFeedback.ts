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
  taskId: { type: "string" },
  signal: { type: "string" }, // good | bad
  reason: { type: "string" },
};

export const run: ActionRun = async ({ api, params: actionParams, session }) => {
  const signal = String((actionParams as any)?.signal || "").toLowerCase();
  if (signal !== "good" && signal !== "bad") throw new Error("signal must be good or bad");
  const reason = String((actionParams as any)?.reason || "").trim();
  if (!reason) throw new Error("reason is required");

  const appConfig = await api.appConfiguration.findFirst({
    select: { id: true, plannerFeedbackLogJson: true } as any,
  });
  if (!appConfig?.id) throw new Error("App configuration not found");

  const feedback = asArray<any>((appConfig as any)?.plannerFeedbackLogJson);
  const userRef = session?.get("user");
  const actorUserId =
    typeof userRef === "string" ? userRef : (userRef as any)?._link ?? (userRef as any)?.id ?? null;

  const nextFeedback = [
    {
      id: `feedback:${Date.now()}`,
      suggestionId: (actionParams as any)?.suggestionId || null,
      taskId: (actionParams as any)?.taskId || null,
      signal,
      reason,
      actorUserId,
      createdAt: new Date().toISOString(),
    },
    ...feedback,
  ].slice(0, 1000);

  await api.appConfiguration.update(appConfig.id, {
    plannerFeedbackLogJson: nextFeedback as any,
  } as any);

  return { ok: true, saved: 1 };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
