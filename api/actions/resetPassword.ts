import { ActionOptions } from "gadget-server";
import { assert } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api }) => {
  const code = assert(params.code, "Reset code is required");
  const password = assert(params.password, "New password is required");

  // Find the user by reset token
  const user = await api.user.maybeFindFirst({
    filter: {
      resetPasswordToken: {
        equals: code,
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired reset code");
  }

  // Check if token has expired
  const now = new Date();
  if (!user.resetPasswordTokenExpiry || user.resetPasswordTokenExpiry < now) {
    throw new Error("Reset code has expired");
  }

  // Update the user's password and clear the reset token fields
  await api.user.update(user.id, {
    password,
    resetPasswordToken: null,
    resetPasswordTokenExpiry: null,
  });

  return { success: true };
};

export const params = {
  code: { type: "string" },
  password: { type: "string" },
};

export const options: ActionOptions = {
  returnType: true,
  triggers: {
    api: true,
  },
};
