import type { ActionOptions } from "gadget-server";

export const params = {
  code: { type: "string" },
};

export const run: ActionRun = async ({ api, params }) => {
  const code = String(params?.code || "");
  if (!code) throw new Error("code is required");

  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      trueLayerClientId: true,
      trueLayerClientSecret: true,
      trueLayerRedirectUri: true,
    } as any,
  });
  if (!config?.id) throw new Error("Missing app configuration");

  const clientId = String((config as any)?.trueLayerClientId || process.env.TRUELAYER_CLIENT_ID || "");
  const clientSecret = String((config as any)?.trueLayerClientSecret || process.env.TRUELAYER_CLIENT_SECRET || "");
  const redirectUri = String((config as any)?.trueLayerRedirectUri || process.env.TRUELAYER_REDIRECT_URI || "");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("TrueLayer client credentials are not configured");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch("https://auth.truelayer.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "TrueLayer token exchange failed");
  }

  const expiresAt = new Date(Date.now() + Number(payload?.expires_in || 0) * 1000);
  await api.appConfiguration.update(config.id, {
    trueLayerAccessToken: payload?.access_token || null,
    trueLayerRefreshToken: payload?.refresh_token || null,
    trueLayerTokenExpiresAt: expiresAt,
    trueLayerConnectionStatus: "connected",
  } as any);

  return { ok: true, expiresAt: expiresAt.toISOString() };
};

export const options: ActionOptions = {};
