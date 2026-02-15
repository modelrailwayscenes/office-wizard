import { randomUUID } from "crypto";
import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ logger, config, session, currentAppUrl }) => {
  const clientId = config.MICROSOFT_CLIENT_ID;
  const tenantId = config.MICROSOFT_TENANT_ID;

  if (!clientId || !tenantId) {
    throw new Error(
      "Microsoft OAuth credentials not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_TENANT_ID."
    );
  }

  if (!session) {
    throw new Error("No session found. Please sign in first.");
  }

  const state = randomUUID();
  await session.set("oauthState", state);

  const redirectUri = new URL("/authorize", currentAppUrl).toString();

  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send",
    state,
    prompt: "consent",
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${authParams.toString()}`;

  logger.info({ redirectUri, authUrl }, "Generated Microsoft OAuth URL");

  return { ok: true, authUrl };
};

export const options: ActionOptions = {
  returnType: true,
  triggers: { api: true },
};