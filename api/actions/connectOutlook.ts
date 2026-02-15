import { randomBytes } from "crypto";
import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api, config }) => {
  const clientId = config.MICROSOFT_CLIENT_ID;
  const tenantId = config.MICROSOFT_TENANT_ID;
  
  if (!clientId || !tenantId) {
    throw new Error("Microsoft OAuth credentials not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_TENANT_ID environment variables.");
  }

  // Generate CSRF state token
  const state = generateRandomString(32);
  
  // Build redirect URI (should match what's in Azure AD app registration)
  const redirectUri = `${process.env.GADGET_APP_URL || "https://email-wizard--development.gadget.app"}/auth/microsoft/callback`;
  
  // Build authorization URL
  const scopes = ["offline_access", "User.Read", "Mail.Read", "Mail.ReadWrite", "Mail.Send"];
  
  const authParams = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: scopes.join(" "),
    state: state,
    prompt: "consent" // Force consent screen to ensure we get refresh token
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${authParams.toString()}`;
  
  logger.info({ authUrl, state, redirectUri }, "Generated Outlook OAuth URL");
  
  return {
    authUrl,
    state
  };
};

function generateRandomString(length: number): string {
  // Generate cryptographically secure random string
  return randomBytes(length).toString("hex").slice(0, length);
}

export const options: ActionOptions = {
  returnType: true,
  triggers: { api: true }
};
