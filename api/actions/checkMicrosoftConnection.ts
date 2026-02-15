import type { ActionOptions } from "gadget-server";
import { getMicrosoftGraphClient } from "../lib/microsoftGraph";

export const run: ActionRun = async ({ api, logger }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      microsoftAccessToken: true,
      microsoftTokenExpiresAt: true,
    },
  });

  if (!config) {
    return { ok: false, connected: false, error: "No appConfiguration record found" };
  }

  if (!config.microsoftAccessToken) {
    return { ok: true, connected: false };
  }

  const expiresAt = config.microsoftTokenExpiresAt ? new Date(config.microsoftTokenExpiresAt) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (needsRefresh) {
    logger.info("Token expiring soon, refreshing...");

    const refreshResult = await api.refreshAccessToken();

    if (!refreshResult?.ok) {
      return { ok: false, connected: false, error: refreshResult?.error || "Refresh failed" };
    }

    const updated = await api.appConfiguration.findFirst({
      select: { microsoftAccessToken: true },
    });

    if (!updated?.microsoftAccessToken) {
      return { ok: false, connected: false, error: "Refresh succeeded but token missing" };
    }

    config.microsoftAccessToken = updated.microsoftAccessToken;
  }

  try {
    const graphClient = getMicrosoftGraphClient(config.microsoftAccessToken);

    const me = await graphClient.api("/me").get();

    return {
      ok: true,
      connected: true,
      account: {
        id: me?.id ?? null,
        displayName: me?.displayName ?? null,
        mail: me?.mail ?? null,
        userPrincipalName: me?.userPrincipalName ?? null,
      },
    };
  } catch (error: any) {
    logger.error({ error }, "Graph connection test failed");
    return { ok: false, connected: false, error: error?.message || "Graph connection failed" };
  }
};

export const options: ActionOptions = {
  returnType: true,
};