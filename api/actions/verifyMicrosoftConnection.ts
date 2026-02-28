import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api, connections }) => {
  try {
    // Get the app configuration with Microsoft tokens
    const config = await api.appConfiguration.findFirst({
      select: {
        id: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true
      }
    });

    if (!config) {
      logger.warn("No app configuration found");
      return { connected: false, error: "No configuration found" };
    }

    if (!config.microsoftAccessToken) {
      logger.warn("No Microsoft access token found in configuration");
      return { connected: false, error: "No token found" };
    }

    // Test the connection with a simple API call
    const testConnection = async (token: string) => {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return { success: true, email: userData.mail || userData.userPrincipalName };
      }

      return { success: false, status: response.status, statusText: response.statusText };
    };

    // Try initial connection
    logger.info("Testing Microsoft Graph API connection");
    let result = await testConnection(config.microsoftAccessToken);

    if (result.success) {
      await api.appConfiguration.update(config.id, {
        microsoftConnectionStatus: "connected",
        microsoftLastError: null,
        microsoftLastVerifiedAt: new Date(),
        connectedMailbox: result.email || null,
      } as any);
      logger.info({ verified: true }, "Microsoft connection verified successfully");
      return { connected: true, email: result.email };
    }

    // If unauthorized, try refreshing the token
    if (result.status === 401) {
      logger.info("Token appears expired, attempting to refresh");
      
      if (!config.microsoftRefreshToken) {
        logger.error("No refresh token available");
        return { connected: false, error: "Token expired and no refresh token available" };
      }

      try {
        await api.refreshAccessToken();
        logger.info("Token refreshed, retrying connection test");

        // Get the updated token
        const updatedConfig = await api.appConfiguration.findFirst({
          select: {
            id: true,
            microsoftAccessToken: true
          }
        });

        if (!updatedConfig?.microsoftAccessToken) {
          logger.error("Failed to retrieve refreshed token");
          return { connected: false, error: "Token refresh failed" };
        }

        // Retry the connection with the new token
        result = await testConnection(updatedConfig.microsoftAccessToken);

        if (result.success) {
          await api.appConfiguration.update(config.id, {
            microsoftConnectionStatus: "connected",
            microsoftLastError: null,
            microsoftLastVerifiedAt: new Date(),
            connectedMailbox: result.email || null,
          } as any);
          logger.info({ verified: true, refreshed: true }, "Microsoft connection verified after token refresh");
          return { connected: true, email: result.email, refreshed: true };
        }

        await api.appConfiguration.update(config.id, {
          microsoftConnectionStatus: "error",
          microsoftLastError: "Token invalid and refresh failed",
          microsoftLastVerifiedAt: new Date(),
        } as any);
        logger.error({ connectionFailed: true }, "Connection still failed after token refresh");
        return { connected: false, error: "Token invalid and refresh failed" };
      } catch (refreshError) {
        await api.appConfiguration.update(config.id, {
          microsoftConnectionStatus: "error",
          microsoftLastError: `Token refresh error: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`,
          microsoftLastVerifiedAt: new Date(),
        } as any);
        logger.error({ refreshFailed: true }, "Error refreshing token");
        return { connected: false, error: `Token refresh error: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}` };
      }
    }

    // Other error
    await api.appConfiguration.update(config.id, {
      microsoftConnectionStatus: "error",
      microsoftLastError: `API call failed: ${result.statusText}`,
      microsoftLastVerifiedAt: new Date(),
    } as any);
    logger.error({ apiFailed: true }, "Microsoft Graph API call failed");
    return { connected: false, error: `API call failed: ${result.statusText}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const config = await api.appConfiguration.findFirst({ select: { id: true } as any });
      if (config?.id) {
        await api.appConfiguration.update(config.id, {
          microsoftConnectionStatus: "error",
          microsoftLastError: message,
          microsoftLastVerifiedAt: new Date(),
        } as any);
      }
    } catch {
      // no-op: do not mask original verification error
    }
    logger.error({ error }, "Error verifying Microsoft connection");
    return { connected: false, error: message };
  }
};

export const options: ActionOptions = {
  returnType: true
};
