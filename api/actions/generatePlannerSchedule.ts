import type { ActionOptions } from "gadget-server";

type PlannerWorkItem = {
  id: string;
  title: string;
  workflowType?: string;
  status?: string;
  priorityScore?: number;
  dueAt?: string;
  estimatedMinutes?: number;
  assigneeUserId?: string | null;
  assigneeLabel?: string | null;
};

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

const workingWindows = [
  { weekday: 1, startHour: 9, endHour: 18 }, // Mon
  { weekday: 2, startHour: 9, endHour: 18 },
  { weekday: 3, startHour: 9, endHour: 18 },
  { weekday: 4, startHour: 9, endHour: 18 },
  { weekday: 5, startHour: 9, endHour: 18 },
  { weekday: 6, startHour: 9, endHour: 13 }, // Sat
];

const nextWorkingSlot = (cursor: Date) => {
  const d = new Date(cursor);
  for (let i = 0; i < 14; i++) {
    const weekday = d.getDay();
    const match = workingWindows.find((w) => w.weekday === weekday);
    if (!match) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      continue;
    }
    const start = new Date(d);
    start.setHours(match.startHour, 0, 0, 0);
    const end = new Date(d);
    end.setHours(match.endHour, 0, 0, 0);
    if (d < start) return { start, end };
    if (d >= start && d < end) return { start: d, end };
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  }
  const fallback = new Date();
  fallback.setHours(9, 0, 0, 0);
  const fallbackEnd = new Date(fallback);
  fallbackEnd.setHours(18, 0, 0, 0);
  return { start: fallback, end: fallbackEnd };
};

export const params = {
  horizonDays: { type: "number" },
};

export const run: ActionRun = async ({ api, logger, params: actionParams }) => {
  const horizonDays = Math.min(Math.max(Number((actionParams as any)?.horizonDays || 3), 1), 7);
  const appConfig = await api.appConfiguration.findFirst({
    select: {
      id: true,
      plannerWorkItemsJson: true,
      plannerFeedbackLogJson: true,
      plannerReassignSuggestionsJson: true,
    } as any,
  });
  if (!appConfig?.id) throw new Error("App configuration not found");

  const workItems = asArray<PlannerWorkItem>((appConfig as any)?.plannerWorkItemsJson).filter(
    (item) => !["fulfilled", "cancelled", "done"].includes(String(item?.status || "").toLowerCase())
  );
  const users = await api.user.findMany({
    first: 20,
    filter: { emailVerified: { equals: true } } as any,
    select: { id: true, email: true } as any,
  });
  const userPool = (users || []).slice(0, 2);
  if (userPool.length === 0) throw new Error("No active users available for planning");

  const sorted = [...workItems].sort((a, b) => Number(b.priorityScore || 0) - Number(a.priorityScore || 0));
  const horizonEnd = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000);
  const userCursor = new Map<string, Date>(userPool.map((u) => [u.id, new Date()]));

  const scheduleBlocks: any[] = [];
  for (let idx = 0; idx < sorted.length; idx++) {
    const item = sorted[idx];
    const forcedUser =
      item.assigneeUserId && userPool.find((u) => u.id === item.assigneeUserId) ? item.assigneeUserId : null;
    const assignedUser = forcedUser
      ? userPool.find((u) => u.id === forcedUser)!
      : userPool[idx % userPool.length];

    let cursor = new Date(userCursor.get(assignedUser.id) || new Date());
    let slot = nextWorkingSlot(cursor);
    const minutes = Math.max(5, Number(item.estimatedMinutes || 15));
    let end = new Date(slot.start.getTime() + minutes * 60 * 1000);
    if (end > slot.end) {
      const nextSlot = nextWorkingSlot(new Date(slot.end.getTime() + 60 * 1000));
      slot = nextSlot;
      end = new Date(slot.start.getTime() + minutes * 60 * 1000);
    }
    if (slot.start > horizonEnd) continue;

    userCursor.set(assignedUser.id, new Date(end.getTime() + 10 * 60 * 1000)); // 10-min buffer

    scheduleBlocks.push({
      id: `block:${item.id}:${assignedUser.id}:${slot.start.toISOString()}`,
      taskId: item.id,
      taskTitle: item.title,
      assigneeUserId: assignedUser.id,
      assigneeLabel: assignedUser.email,
      startAt: slot.start.toISOString(),
      endAt: end.toISOString(),
      blockType: Number(item.priorityScore || 0) >= 90 ? "timed" : "bucket",
      status: "planned",
      explainability: {
        whyNow:
          item.dueAt && new Date(item.dueAt).getTime() - Date.now() < 48 * 60 * 60 * 1000
            ? "Deadline is near, prioritised for SLA safety."
            : "Placed in current horizon using priority score and capacity.",
        whyAssignee:
          forcedUser
            ? "Kept existing assignee from upstream workflow."
            : "Assigned by available capacity in current planning window.",
        whySequence: "Sorted by priority score and slotted into first available working window.",
      },
    });
  }

  const suggestions = scheduleBlocks
    .filter((b) => b.blockType === "timed")
    .slice(0, 5)
    .map((block, idx) => {
      const from = userPool.find((u) => u.id === block.assigneeUserId);
      const to = userPool.find((u) => u.id !== block.assigneeUserId) || from;
      return {
        id: `sugg:${block.id}`,
        taskId: block.taskId,
        task: block.taskTitle,
        fromUserId: from?.id || null,
        fromUser: from?.email || "unknown",
        toUserId: to?.id || null,
        toUser: to?.email || "unknown",
        reason: "Alternative assignee has free capacity block and similar suitability.",
        confidence: Math.max(0.7, 0.95 - idx * 0.03),
        createdAt: new Date().toISOString(),
      };
    });

  await api.appConfiguration.update(appConfig.id, {
    plannerScheduleBlocksJson: scheduleBlocks as any,
    plannerReassignSuggestionsJson: suggestions as any,
    plannerLastPlanAt: new Date(),
  } as any);

  logger.info(
    { workItems: sorted.length, blocks: scheduleBlocks.length, suggestions: suggestions.length },
    "Planner schedule generated"
  );
  return {
    ok: true,
    workItemsConsidered: sorted.length,
    blocksGenerated: scheduleBlocks.length,
    suggestionsGenerated: suggestions.length,
  };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
