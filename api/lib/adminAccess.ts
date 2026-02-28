export function getSessionUserId(session: any): string | null {
  const userRef = session?.get("user");
  if (!userRef) return null;
  if (typeof userRef === "string") return userRef;
  return userRef?._link || userRef?.id || null;
}

export async function requireAdminUser(api: any, session: any): Promise<string> {
  const userId = getSessionUserId(session);
  if (!userId) throw new Error("Not authenticated");

  const user = await api.user.findOne(userId, {
    select: { roleList: { key: true } } as any,
  });
  const roleKeys = Array.isArray((user as any)?.roleList)
    ? (user as any).roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  if (!isAdmin) throw new Error("Admin permissions required");
  return userId;
}
