export async function logProductionEvent({
  api,
  productionJobId,
  type,
  actorUserId,
  fromValue,
  toValue,
}: {
  api: any;
  productionJobId: string;
  type: "created" | "status_changed" | "assigned" | "edited" | "batched" | "unbatched" | "note_added";
  actorUserId?: string | null;
  fromValue?: Record<string, any> | null;
  toValue?: Record<string, any> | null;
}) {
  if (!productionJobId) return;
  await api.productionEvent.create({
    productionJob: { _link: productionJobId },
    type,
    actorUser: actorUserId ? { _link: actorUserId } : undefined,
    fromValue: fromValue || {},
    toValue: toValue || {},
  });
}
