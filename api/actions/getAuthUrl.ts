import type { ActionOptions } from "gadget-server";
import { randomBytes } from "crypto";

function generateState(len = 32): string {
  return randomBytes(len).toString("hex").slice(0, len);
}

function normalizeBaseUrl(currentAppUrl: string): string {
  return currentAppUrl.replace(/\/+$/, "");
}

export const run: ActionRun = async ({ logger, session, context }) => {
  const currentAppUrl = context?.currentAppUrl;
  if (!currentAppUrl) {
    return { success: false, error: "Missing currentAppUrl in context" };
  }

  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!tenantId || !clientId) {
    return { success: false, error: "Missing MICROSOFT_TENANT_ID or MICROSOFT_CLIENT_ID env vars" };
  }

  const baseUrl = normalizeBaseUrl(currentAppUrl);
  const redirectUri = `${baseUrl}/authorize`;

  const state = generateState(32);

  if (session) {
    session.set("microsoftOAuthState", state);
  }

  const url = new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);

  // Graph permissions (minimal but usable)
  url.searchParams.set("scope", [
    "offline_access",
    "openid",
    "profile",
    "email",
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/User.Read",
  ].join(" "));

  url.searchParams.set("state", state);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("prompt", "select_account");

  const authUrl = url.toString();

  logger.info({ redirectUri }, "Generated Microsoft OAuth URL");

  return { success: true, authUrl, state, redirectUri };
};

export const options: ActionOptions = {
  returnType: true,
};