import { ActionOptions } from "gadget-server";
import { resolveSupportSettings, shouldRecordAudit, supportSettingsSelect } from "../lib/supportSettings";

function getUserIdFromSession(session: any): string | null {
  const userRef = session?.get("user");
  if (!userRef) return null;
  if (typeof userRef === "string") return userRef;
  return userRef?._link || userRef?.id || null;
}

export const run: ActionRun = async ({ api, params, session }) => {
  const userId = getUserIdFromSession(session);
  if (!userId) throw new Error("Not authenticated");

  const currentPassword = String((params as any)?.currentPassword ?? "");
  const newPassword = String((params as any)?.newPassword ?? "");
  if (!currentPassword || !newPassword) throw new Error("Current password and new password are required");
  if (currentPassword === newPassword) throw new Error("New password must be different");

  const config = await api.appConfiguration.findFirst({ select: supportSettingsSelect as any });
  const settings = resolveSupportSettings(config as any);

  const policyErrors: string[] = [];
  if (settings.pwRequireMinLength && newPassword.length < 8) policyErrors.push("at least 8 characters");
  if (settings.pwRequireUppercase && !/[A-Z]/.test(newPassword)) policyErrors.push("an uppercase letter");
  if (settings.pwRequireNumbers && !/[0-9]/.test(newPassword)) policyErrors.push("a number");
  if (settings.pwRequireSpecial && !/[^A-Za-z0-9]/.test(newPassword)) policyErrors.push("a special character");
  if (policyErrors.length > 0) {
    throw new Error(`Password policy failed: include ${policyErrors.join(", ")}`);
  }

  // Gadget stores passwords on the user model. This updates the caller's own account.
  await api.user.update(userId, { password: newPassword } as any);

  if (shouldRecordAudit(settings, "auth")) {
    await api.actionLog.create({
      action: "config_changed",
      actionDescription: "User changed own password",
      performedAt: new Date(),
      performedBy: userId,
      performedVia: "web_ui",
      metadata: {
        event: "password_change",
        userId,
      },
    } as any);
  }

  return { success: true };
};

export const params = {
  currentPassword: { type: "string" },
  newPassword: { type: "string" },
};

export const options: ActionOptions = {
  triggers: {
    api: true,
  },
};
