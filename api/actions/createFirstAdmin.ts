import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ api, params }) => {
  const email = String(params.email ?? "").trim().toLowerCase();
  const password = String(params.password ?? "");

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Only allow this once (first admin bootstrap)
  const existing = await api.internal.user.findMany({
    first: 1,
    select: { id: true, roleList: true },
  });

  const hasAdmin = existing.some(user => 
    user.roleList?.includes('system-admin')
  );

  if (hasAdmin) {
    throw new Error("Admin account already exists");
  }

  // Create user
  const user = await api.user.create({
    email,
    password,
    emailVerified: true,
  });

  // Use internal API to set roles (roleList is read-only in the public API)
  await api.internal.user.update(user.id, {
    roleList: ["signed-in", "system-admin"],
  });

  return { success: true, userId: user.id };
};

export const params = {
  email: { type: "string" },
  password: { type: "string" }
};

export const options: ActionOptions = {
  triggers: {
    api: true
  }
};