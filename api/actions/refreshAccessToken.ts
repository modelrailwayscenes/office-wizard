import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api, connections }) => {
  try {
    // Get appConfiguration record
    const config = await api.appConfiguration.findFirst({
      select: {
        id: true,
        microsoftRefreshToken: true
      }
    });

    if (!config) {
      logger.error("No appConfiguration record found");
      return {
        success: false,
        error: "No appConfiguration record found"
      };
    }

    // Read environment variables for static credentials
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const refreshToken = config.microsoftRefreshToken;

    // Validate required credentials
    if (!clientId || !clientSecret || !tenantId || !refreshToken) {
      logger.error("Missing required credentials for token refresh");
      return {
        success: false,
        error: "Missing required credentials (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, or microsoftRefreshToken in config)"
      };
    }

    // Prepare token endpoint URL
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    // Prepare request body
    const requestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send'
    });

    logger.info("Requesting new access token from Microsoft");

    // Make POST request to token endpoint
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, "Failed to refresh access token");
      return {
        success: false,
        error: `Failed to refresh token: ${response.status} ${response.statusText}`
      };
    }

    // Parse response
    const tokenData = await response.json();

    // Extract tokens and expiration
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || refreshToken; // Microsoft may rotate the refresh token
    const expiresIn = tokenData.expires_in; // in seconds

    if (!newAccessToken) {
      logger.error("No access token in response");
      return {
        success: false,
        error: "No access token received from Microsoft"
      };
    }

    // Calculate expiration timestamp (current time + expires_in seconds)
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));

    // Update appConfiguration with new tokens
    await api.appConfiguration.update(config.id, {
      microsoftAccessToken: newAccessToken,
      microsoftRefreshToken: newRefreshToken,
      microsoftTokenExpiresAt: expiresAt
    });

    logger.info({ expiresAt: expiresAt.toISOString() }, "Successfully refreshed access token");

    return {
      success: true
    };

  } catch (error) {
    logger.error({ error }, "Error refreshing access token");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};

export const options: ActionOptions = {
  returnType: true,
};
