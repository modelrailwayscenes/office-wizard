export const run: ActionRun = async ({ logger, api }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      mondayApiToken: true,
    } as any,
  });

  const apiToken = (config as any)?.mondayApiToken;

  if (!apiToken) {
    return {
      connected: false,
      error: "monday.com API token not configured",
    };
  }

  try {
    // Test connection by fetching current user info
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
        "API-Version": "2024-01",
      },
      body: JSON.stringify({
        query: "{ me { name email account { name } } }",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ status: response.status, errorText }, "monday.com verification failed");

      await api.appConfiguration.update(config!.id, {
        mondayConnectionStatus: "error",
      } as any);

      return {
        connected: false,
        error: `monday.com API returned ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      const errorMsg = data.errors.map((e: any) => e.message).join(", ");
      logger.warn({ errors: data.errors }, "monday.com GraphQL errors");

      await api.appConfiguration.update(config!.id, {
        mondayConnectionStatus: "error",
      } as any);

      return {
        connected: false,
        error: errorMsg,
      };
    }

    const userName = data?.data?.me?.name || "Unknown";
    const accountName = data?.data?.me?.account?.name || "Unknown";

    logger.info({ userName, accountName }, "monday.com connection verified");

    await api.appConfiguration.update(config!.id, {
      mondayConnectionStatus: "connected",
      mondayLastVerifiedAt: new Date().toISOString(),
    } as any);

    return {
      connected: true,
      userName,
      accountName,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "monday.com verification error");

    await api.appConfiguration.update(config!.id, {
      mondayConnectionStatus: "error",
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