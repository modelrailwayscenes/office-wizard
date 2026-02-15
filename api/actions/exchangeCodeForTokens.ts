import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api, currentAppUrl }) => {
  const { code, state } = params;

  if (!code) {
    return { success: false, error: "Authorization code is required" };
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const baseUrl = currentAppUrl.replace(/\/$/, ''); // remove trailing slash if present
  const redirectUri = `${baseUrl}/authorize`;
  
  logger.info({ redirectUri, currentAppUrl }, "Using redirect URI for token exchange");

  if (!clientId || !clientSecret || !tenantId) {
    return { success: false, error: "Missing required environment variables" };
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          scope: 'offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error({ error: errorText }, "Failed to exchange code for tokens");
      return { success: false, error: `Token exchange failed: ${errorText}` };
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Get user email from Microsoft Graph
    const meResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      logger.error({ error: errorText }, "Failed to get user info from Microsoft Graph");
      return { success: false, error: `Failed to get user info: ${errorText}` };
    }

    const userData = await meResponse.json();
    const connectedMailbox = userData.mail || userData.userPrincipalName;

    // Update appConfiguration with tokens and connection info
    const config = await api.appConfiguration.findFirst();
    
    if (config) {
      await api.appConfiguration.update(config.id, {
        outlookConnected: true,
        connectedMailbox: connectedMailbox,
        microsoftAccessToken: access_token,
        microsoftRefreshToken: refresh_token,
        microsoftTokenExpiresAt: expiresAt,
        microsoftConnectionStatus: 'connected',
        microsoftLastVerifiedAt: new Date(),
      });
    } else {
      logger.warn("No appConfiguration found to update");
    }

    logger.info({ connectedMailbox, expiresAt }, "Successfully exchanged code for tokens and stored in appConfiguration");

    return {
      success: true,
      connectedMailbox,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "Error exchanging code for tokens");
    return { success: false, error: error.message };
  }
};

export const options: ActionOptions = {
  returnType: true,
};

// Export params for Gadget's type generation
export const params = {
  code: { type: "string" },
  state: { type: "string" },
};
