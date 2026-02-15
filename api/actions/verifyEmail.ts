import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api }) => {
  const { code } = params;

  if (!code) {
    throw new Error("Verification code is required");
  }

  // Find the user by verification token
  const user = await api.user.findFirst({
    filter: {
      emailVerificationToken: { equals: code }
    }
  });

  if (!user) {
    throw new Error("Invalid verification code");
  }

  // Check if the token has expired
  if (user.emailVerificationTokenExpiry && new Date(user.emailVerificationTokenExpiry) < new Date()) {
    throw new Error("Verification code has expired");
  }

  // Token is valid - verify the email
  await api.user.update(user.id, {
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiry: null
  });

  logger.info({ userId: user.id }, "Email verified successfully");

  return { success: true };
};

export const options: ActionOptions = {
  returnType: true,
  triggers: {
    api: true,
  },
};

export const params = {
  code: { type: "string" },
};
