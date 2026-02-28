import type { ActionOptions } from "gadget-server";
import { requireAdminUser } from "../lib/adminAccess";

const BATCH_SIZE = 200;

type PurgeStats = {
  deleted: number;
  failed: number;
  rounds: number;
};

async function purgeModel({
  key,
  findIds,
  deleteById,
  logger,
}: {
  key: string;
  findIds: () => Promise<Array<{ id: string }>>;
  deleteById: (id: string) => Promise<unknown>;
  logger: any;
}): Promise<PurgeStats> {
  let deleted = 0;
  let failed = 0;
  let rounds = 0;

  while (true) {
    const rows = await findIds();
    if (rows.length === 0) break;
    rounds++;

    let deletedThisRound = 0;
    for (const row of rows) {
      try {
        await deleteById(row.id);
        deleted++;
        deletedThisRound++;
      } catch (error: any) {
        failed++;
        logger.warn(
          { model: key, id: row.id, error: error?.message || String(error) },
          "Failed to delete row during hard reset"
        );
      }
    }

    if (deletedThisRound === 0) {
      logger.warn(
        { model: key, attempted: rows.length },
        "Hard reset made no progress for this model; stopping to avoid infinite loop"
      );
      break;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  return { deleted, failed, rounds };
}

export const run: ActionRun = async ({ logger, api, session }) => {
  await requireAdminUser(api, session);

  logger.warn("Starting hard support data reset (NO FETCH)");

  const targets = [
    {
      key: "classification",
      findIds: () => api.classification.findMany({ first: BATCH_SIZE, select: { id: true } as any }),
      deleteById: (id: string) => api.classification.delete(id),
    },
    {
      key: "aiComment",
      findIds: () => api.aiComment.findMany({ first: BATCH_SIZE, select: { id: true } as any }),
      deleteById: (id: string) => api.aiComment.delete(id),
    },
    {
      key: "actionLog",
      findIds: () => api.actionLog.findMany({ first: BATCH_SIZE, select: { id: true } as any }),
      deleteById: (id: string) => api.actionLog.delete(id),
    },
    {
      key: "emailMessage",
      findIds: () => api.emailMessage.findMany({ first: BATCH_SIZE, select: { id: true } as any }),
      deleteById: (id: string) => api.emailMessage.delete(id),
    },
    {
      key: "conversation",
      findIds: () => api.conversation.findMany({ first: BATCH_SIZE, select: { id: true } as any }),
      deleteById: (id: string) => api.conversation.delete(id),
    },
    {
      key: "triageSession",
      findIds: () => api.triageSession.findMany({ first: BATCH_SIZE, select: { id: true } as any }),
      deleteById: (id: string) => api.triageSession.delete(id),
    },
  ] as const;

  const deleted: Record<string, PurgeStats> = {};
  for (const target of targets) {
    deleted[target.key] = await purgeModel({
      key: target.key,
      findIds: target.findIds,
      deleteById: target.deleteById,
      logger,
    });
  }

  const remainingAny = {
    classification: (await api.classification.findMany({ first: 1, select: { id: true } as any })).length > 0,
    aiComment: (await api.aiComment.findMany({ first: 1, select: { id: true } as any })).length > 0,
    actionLog: (await api.actionLog.findMany({ first: 1, select: { id: true } as any })).length > 0,
    emailMessage: (await api.emailMessage.findMany({ first: 1, select: { id: true } as any })).length > 0,
    conversation: (await api.conversation.findMany({ first: 1, select: { id: true } as any })).length > 0,
    triageSession: (await api.triageSession.findMany({ first: 1, select: { id: true } as any })).length > 0,
  };

  const appConfig = await api.appConfiguration.findFirst({
    select: { id: true, lastSyncAt: true } as any,
  });

  if (appConfig?.id) {
    await api.appConfiguration.update(appConfig.id, {
      lastSyncAt: null,
    } as any);
  }

  const result = {
    success: true,
    noFetch: true,
    syncCursorCleared: Boolean(appConfig?.id),
    deleted,
    remainingAny,
  };

  logger.info(result, "Hard support data reset completed (NO FETCH)");
  return result;
};

export const options: ActionOptions = {
  timeoutMS: 900000, // 15 minutes
  triggers: {
    api: true,
  },
};

