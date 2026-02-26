export async function findJobByExternalRef(api: any, externalRef: string) {
  if (!externalRef) return null;
  const found = await api.productionJob.findMany({
    first: 1,
    filter: { externalRef: { equals: externalRef } },
    select: { id: true, externalRef: true, status: true, updatedAt: true },
  });
  return (found || [])[0] || null;
}

export async function upsertProductionJobByExternalRef(api: any, payload: Record<string, any>) {
  const existing = await findJobByExternalRef(api, String(payload.externalRef || ""));
  if (existing?.id) {
    await api.productionJob.update({ id: existing.id, ...payload });
    return { id: existing.id, created: false };
  }
  const created = await api.productionJob.create(payload);
  return { id: created?.id, created: true };
}
