export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      shopifyStoreDomain: true,
      shopifyAccessToken: true,
    } as any,
  });

  const storeDomain = (config as any)?.shopifyStoreDomain;
  const accessToken = (config as any)?.shopifyAccessToken;

  if (!storeDomain || !accessToken) {
    return {
      connected: false,
      error: "Shopify credentials not configured",
    };
  }

  try {
    // Test connection by fetching shop info
    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-01/shop.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ status: response.status, errorText }, "Shopify verification failed");

      await api.appConfiguration.update(config!.id, {
        shopifyConnectionStatus: "error",
      } as any);

      return {
        connected: false,
        error: `Shopify API returned ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const shopName = data?.shop?.name || storeDomain;

    logger.info({ shopName }, "Shopify connection verified");

    await api.appConfiguration.update(config!.id, {
      shopifyConnectionStatus: "connected",
      shopifyLastVerifiedAt: new Date().toISOString(),
    } as any);

    return {
      connected: true,
      shopName,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "Shopify verification error");

    await api.appConfiguration.update(config!.id, {
      shopifyConnectionStatus: "error",
    } as any);

    return {
      connected: false,
      error: error.message,
    };
  }
};

export const options = {
  triggers: { api: true },
};