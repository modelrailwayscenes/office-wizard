import { ActionOptions, assert } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api }) => {
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
