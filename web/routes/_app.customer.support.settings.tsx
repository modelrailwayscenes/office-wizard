import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/_app.customer.support.settings";

const BASE = "/customer/support";
const PERSONAL_PATHS = [`${BASE}/settings/profile`, `${BASE}/settings/personal`];

const getUserIdFromSession = (userRef: any) => {
  if (typeof userRef === "string") return userRef;
  if (userRef?._link) return userRef._link;
  if (userRef?.id) return userRef.id;
  return null;
};

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  const { session, api } = context;
  const userRef = session?.get("user");
  if (!userRef) throw redirect("/sign-in");

  const userId = getUserIdFromSession(userRef);
  if (!userId) throw redirect("/sign-in");

  const user = await api.user.findOne(userId, {
    select: { roleList: { key: true } },
  });
  if (!user) throw redirect("/sign-in");

  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  const path = new URL(request.url).pathname;
  const isPersonalPath =
    PERSONAL_PATHS.some((p) => path === p) ||
    path.startsWith(`${BASE}/settings/profile/`);

  if (!isAdmin) {
    if (path === `${BASE}/settings` || path === `${BASE}/settings/summary`) {
      throw redirect(`${BASE}/settings/profile`);
    }
    if (!isPersonalPath) {
      throw redirect(`${BASE}/settings/profile`);
    }
  }

  return { isAdmin };
};

export default function SettingsLayout() {
  return <Outlet />;
}
