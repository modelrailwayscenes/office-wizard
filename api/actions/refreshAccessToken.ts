import type { ActionOptions } from "gadget-server";
import "isomorphic-fetch";

async function requireConfig(api: any) {
  const config = await api.appConfiguration.maybeFindFirst({
    select: {
      id: true,
      microsoftRefreshToken: true,
      microsoftTenantId: true,
      microsoftClientId: true,
      microsoftClientSecret: true,
    },
  });

  if (!config) throw new Error("Missing appConfiguration record");
  return config;
}

export const run: ActionRun = async ({ logger, api }) => {
  const config = await requireConfig(api);

  if (!config.microsoftRefreshToken) {
    return {
      success: false,
      error: "No Microsoft refresh token found. Reconnect Microsoft 365.",
    };
  }

  const tenantId = (config as any)?.microsoftTenantId || process.env.MICROSOFT_TENANT_ID;
  const clientId = (config as any)?.microsoftClientId || process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = (config as any)?.microsoftClientSecret || process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return {
      success: false,
      error: "Missing Microsoft OAuth settings. Configure Tenant ID, Client ID, and Client Secret in Settings > Integrations.",
    };
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/token`;

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", config.microsoftRefreshToken);

  // SAFEST: omit scope on refresh unless you have a reason to include it
  // (Including a different scope than originally granted can cause failures.)
  // body.set("scope", "offline_access openid profile email https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read");

  let tokenRes: any;

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(), // explicit string is the most compatible
    });

    tokenRes = await res.json();

    if (!res.ok) {
      logger.error({ status: res.status, tokenRes }, "Token refresh failed");
      return {
        success: false,
        error: tokenRes?.error_description || tokenRes?.error || "Token refresh failed",
      };
    }
  } catch (err: any) {
    logger.error({ err }, "Token refresh request error");
    return { success: false, error: err?.message || "Token refresh request failed" };
  }

  const accessToken = tokenRes?.access_token;
  if (!accessToken) {
    logger.error({ tokenRes }, "Refresh succeeded but missing access_token");
    return { success: false, error: "Token refresh succeeded but no access token was returned" };
  }

  const expiresInSec = Number(tokenRes?.expires_in ?? 3600);
  const expiresAt = new Date(Date.now() + expiresInSec * 1000);

  await api.appConfiguration.update(config.id, {
    microsoftAccessToken: accessToken,
    // Microsoft may rotate refresh tokens; if present, store the new one
    microsoftRefreshToken: tokenRes?.refresh_token ?? config.microsoftRefreshToken,
    microsoftTokenExpiresAt: expiresAt,
  });

  logger.info({ expiresAt }, "Microsoft access token refreshed");

  return { success: true, expiresAt };
};

export const options: ActionOptions = {
  returnType: true,
  timeoutMS: 120000,
};