import { deleteRecord, ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, record, logger, api, connections, session }) => {
  const roleKeys = Array.isArray(session?.roles)
    ? session.roles
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  if (!isAdmin) {
    throw new Error("Only admins can delete users.");
  }

  await deleteRecord(record);
};

export const options: ActionOptions = {
  actionType: "delete",
};
