import { ActionOptions, assert } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api, session }) => {
  const roleKeys = Array.isArray(session?.roles)
    ? session.roles
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  if (!isAdmin) {
    throw new Error("Only admins can grant admin access.");
  }

  const userId = assert(params.userId, "userId is required");
  
  // Update the user's roleList using the internal API to bypass permissions
  const result = await api.internal.user.update(userId, {
    roleList: ['signed-in', 'system-admin']
  });
  
  return {
    success: true,
    message: `Successfully granted admin access to user`,
    user: {
      email: result.email,
      roles: result.roleList
    }
  };
};

export const params = {
  userId: {
    type: "string"
  }
};
