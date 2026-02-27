import type { ActionOptions } from "gadget-server";

export const params = {};

export const run: ActionRun = async ({ api, request }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      trueLayerClientId: true,
      trueLayerRedirectUri: true,
    } as any,
  });

  const clientId = String((config as any)?.trueLayerClientId || process.env.TRUELAYER_CLIENT_ID || "");
  const redirectUri = String(
    (config as any)?.trueLayerRedirectUri ||
      process.env.TRUELAYER_REDIRECT_URI ||
      `${request?.headers?.origin || ""}/finance/settings`
  );
  if (!clientId || !redirectUri) {
    throw new Error("TrueLayer client id/redirect uri are not configured");
  }

  const state = Math.random().toString(36).slice(2);
  const scope = "accounts balance cards transactions direct_debits standing_orders offline_access";
  const authUrl =
    `https://auth.truelayer.com/?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&providers=${encodeURIComponent("uk-ob-all uk-oauth-all")}` +
    `&state=${encodeURIComponent(state)}`;

  return { ok: true, authUrl, state };
};

export const options: ActionOptions = {};
