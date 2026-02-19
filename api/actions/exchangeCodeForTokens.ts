import type { ActionOptions } from "gadget-server";

type TokenResponse =
  | {
      token_type?: string;
      scope?: string;
      expires_in?: number;
      ext_expires_in?: number;
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
    }
  | {
      error?: string;
      error_description?: string;
      error_codes?: number[];
    };

function normalizeBaseUrl(currentAppUrl: string): string {
  return currentAppUrl.replace(/\/+$/, "");
}

async function requireConfig(api: any) {
  const config = await api.appConfiguration.maybeFindFirst({
    select: { id: true },
  });
  if (!config) throw new Error("Missing appConfiguration record");
  return config;
}

export const run: ActionRun = async ({ logger, api, params, session, context }) => {
  const code = String((params as any)?.code || "");
  const state = String((params as any)?.state || "");

  if (!code) return { success: false, error: "Missing authorization code" };

  const expectedState = session?.get?.("microsoftOAuthState");
  if (expectedState && state && expectedState !== state) {
    logger.warn({ expectedState, state }, "Microsoft OAuth state mismatch");
    return { success: false, error: "Invalid OAuth state. Please try connecting again." };
  }

  const currentAppUrl = context?.currentAppUrl;
  if (!currentAppUrl) return { success: false, error: "Missing currentAppUrl in context" };

  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return { success: false, error: "Missing Microsoft OAuth environment variables" };
  }

  const redirectUri = `${normalizeBaseUrl(currentAppUrl)}/authorize`;

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);

  let tokenRes: TokenResponse;
  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    tokenRes = (await res.json()) as TokenResponse;

    if (!res.ok) {
      logger.error({ status: res.status, tokenRes }, "Microsoft token exchange failed");
      const errMsg =
        (tokenRes as any)?.error_description ||
        (tokenRes as any)?.error ||
        `Token exchange failed (${res.status})`;
      return { success: false, error: errMsg };
    }
  } catch (err: any) {
    logger.error({ err }, "Microsoft token exchange request error");
    return { success: false, error: err?.message || "Token exchange request failed" };
  }

  const accessToken = (tokenRes as any)?.access_token as string | undefined;
  const refreshToken = (tokenRes as any)?.refresh_token as string | undefined;
  const expiresInSec = Number((tokenRes as any)?.expires_in ?? 3600);

  if (!accessToken) {
    logger.error({ tokenRes }, "Microsoft token exchange missing access_token");
    return { success: false, error: "Token exchange succeeded but no access token was returned" };
  }

  const expiresAt = new Date(Date.now() + expiresInSec * 1000);

  const config = await requireConfig(api);

  await api.appConfiguration.update(config.id, {
    microsoftAccessToken: accessToken,
    microsoftRefreshToken: refreshToken ?? null,
    microsoftTokenExpiresAt: expiresAt,
  });

  if (session) {
    session.set("microsoftOAuthState", null);
  }

  logger.info({ expiresAt }, "Stored Microsoft tokens in appConfiguration");

  return { success: true, expiresAt };
};

export const params = {
  code: { type: "string" },
  state: { type: "string" },
};

export const options: ActionOptions = {
  returnType: true,
  timeoutMS: 120000,
};