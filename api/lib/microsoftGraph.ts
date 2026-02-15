import { Client } from "@microsoft/microsoft-graph-client";

// TypeScript interfaces
export interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
  hasAttachments: boolean;
  importance: string;
  isRead: boolean;
  isDraft: boolean;
  conversationId: string;
  internetMessageId: string;
  inReplyTo?: string;
  parentFolderId: string;
  flag?: {
    flagStatus: string;
  };
  categories?: string[];
}

export interface GraphFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

export interface ListMessagesOptions {
  folderPath?: string;
  folderId?: string;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
  maxResults?: number;
  select?: string[];
  filter?: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  bodyPreview: string;
  from: {
    name: string;
    address: string;
  };
  to: Array<{
    name: string;
    address: string;
  }>;
  cc?: Array<{
    name: string;
    address: string;
  }>;
  receivedDateTime: Date;
  sentDateTime?: Date;
  hasAttachments: boolean;
  isRead: boolean;
  conversationId: string;
  messageId: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MessageUpdates {
  isRead?: boolean;
  flag?: {
    flagStatus: "notFlagged" | "flagged" | "complete";
  };
  categories?: string[];
}

export interface EmailMessageInput {
  subject: string;
  body: string;
  toRecipients: Array<{
    name?: string;
    address: string;
  }>;
  ccRecipients?: Array<{
    name?: string;
    address: string;
  }>;
}

/**
 * Creates an authenticated Microsoft Graph client instance
 */
export function getMicrosoftGraphClient(accessToken: string): Client {
  const authProvider = {
    getAccessToken: async () => accessToken,
  };

  const client = Client.init({
    authProvider: authProvider as any,
  });

  return client;
}

/**
 * Builds the OAuth redirect URI
 */
export function buildRedirectUri(baseUrl: string): string {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  return `${cleanUrl}/authorize`;
}

/**
 * Exchanges an OAuth code for access tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error("Missing required environment variables");
  }

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
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
  };
}

/**
 * Refreshes an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error("Missing required environment variables");
  }

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken,
    expiresAt,
  };
}

/**
 * Fetches messages from a mailbox with filters
 */
export async function listMessages(client: Client, options: ListMessagesOptions = {}): Promise<GraphMessage[]> {
  try {
    let endpoint = "/me/messages";
    
    if (options.folderId) {
      endpoint = `/me/mailFolders/${options.folderId}/messages`;
    }

    const queryParams: string[] = [];

    // Build filter conditions
    const filterConditions: string[] = [];
    
    if (options.startDate) {
      filterConditions.push(`receivedDateTime ge ${options.startDate.toISOString()}`);
    }
    
    if (options.endDate) {
      filterConditions.push(`receivedDateTime le ${options.endDate.toISOString()}`);
    }
    
    if (options.unreadOnly) {
      filterConditions.push("isRead eq false");
    }

    if (options.filter) {
      filterConditions.push(options.filter);
    }

    if (filterConditions.length > 0) {
      queryParams.push(`$filter=${filterConditions.join(" and ")}`);
    }

    // Add select fields
    if (options.select && options.select.length > 0) {
      queryParams.push(`$select=${options.select.join(",")}`);
    }

    // Add top (max results)
    const maxResults = options.maxResults || 100;
    queryParams.push(`$top=${Math.min(maxResults, 999)}`);

    // Add orderby
    queryParams.push("$orderby=receivedDateTime desc");

    const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    const fullEndpoint = `${endpoint}${queryString}`;

    const response = await client.api(fullEndpoint).get();

    const messages = response.value as GraphMessage[];

    return messages;
  } catch (error: any) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }
}

/**
 * Fetches a single message by ID with optional field selection
 */
export async function getMessage(client: Client, messageId: string, select?: string[]): Promise<GraphMessage> {
  try {
    let endpoint = `/me/messages/${messageId}`;
    
    if (select && select.length > 0) {
      endpoint += `?$select=${select.join(",")}`;
    }

    const message = await client.api(endpoint).get();

    return message as GraphMessage;
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new Error(`Message not found: ${messageId}`);
    }
    throw new Error(`Failed to fetch message: ${error.message}`);
  }
}

/**
 * Sends an email message
 */
export async function sendEmail(client: Client, message: EmailMessageInput): Promise<void> {
  try {
    const emailPayload = {
      message: {
        subject: message.subject,
        body: {
          contentType: "HTML",
          content: message.body,
        },
        toRecipients: message.toRecipients.map((recipient) => ({
          emailAddress: {
            name: recipient.name || recipient.address,
            address: recipient.address,
          },
        })),
        ccRecipients: message.ccRecipients?.map((recipient) => ({
          emailAddress: {
            name: recipient.name || recipient.address,
            address: recipient.address,
          },
        })),
      },
      saveToSentItems: true,
    };

    await client.api("/me/sendMail").post(emailPayload);
  } catch (error: any) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Creates a draft email
 */
export async function createDraft(client: Client, message: EmailMessageInput): Promise<GraphMessage> {
  try {
    const draftPayload = {
      subject: message.subject,
      body: {
        contentType: "HTML",
        content: message.body,
      },
      toRecipients: message.toRecipients.map((recipient) => ({
        emailAddress: {
          name: recipient.name || recipient.address,
          address: recipient.address,
        },
      })),
      ccRecipients: message.ccRecipients?.map((recipient) => ({
        emailAddress: {
          name: recipient.name || recipient.address,
          address: recipient.address,
        },
      })),
    };

    const draft = await client.api("/me/messages").post(draftPayload);

    return draft as GraphMessage;
  } catch (error: any) {
    throw new Error(`Failed to create draft: ${error.message}`);
  }
}

/**
 * Creates a reply or reply-all draft
 */
export async function createReply(
  client: Client,
  messageId: string,
  replyBody: string,
  replyAll: boolean = false
): Promise<GraphMessage> {
  try {
    const endpoint = replyAll 
      ? `/me/messages/${messageId}/createReplyAll`
      : `/me/messages/${messageId}/createReply`;

    // Create the reply draft
    const draft = await client.api(endpoint).post({});

    // Update the draft with the reply body
    const updatedDraft = await client.api(`/me/messages/${draft.id}`).patch({
      body: {
        contentType: "HTML",
        content: replyBody,
      },
    });

    return updatedDraft as GraphMessage;
  } catch (error: any) {
    throw new Error(`Failed to create reply: ${error.message}`);
  }
}

/**
 * Updates message properties (read status, flag, categories)
 */
export async function updateMessage(client: Client, messageId: string, updates: MessageUpdates): Promise<GraphMessage> {
  try {
    const payload: any = {};

    if (updates.isRead !== undefined) {
      payload.isRead = updates.isRead;
    }

    if (updates.flag) {
      payload.flag = updates.flag;
    }

    if (updates.categories) {
      payload.categories = updates.categories;
    }

    const updatedMessage = await client.api(`/me/messages/${messageId}`).patch(payload);

    return updatedMessage as GraphMessage;
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new Error(`Message not found: ${messageId}`);
    }
    throw new Error(`Failed to update message: ${error.message}`);
  }
}

/**
 * Moves a message to a different folder
 */
export async function moveMessage(client: Client, messageId: string, destinationFolder: string): Promise<GraphMessage> {
  try {
    // If destinationFolder looks like an ID (GUID), use it directly
    // Otherwise, try to resolve it as a folder path/name
    let destinationFolderId = destinationFolder;

    if (!destinationFolder.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Try to find folder by display name
      const folders = await listFolders(client);
      const folder = folders.find((f) => f.displayName === destinationFolder);
      
      if (!folder) {
        throw new Error(`Folder not found: ${destinationFolder}`);
      }
      
      destinationFolderId = folder.id;
    }

    const movedMessage = await client.api(`/me/messages/${messageId}/move`).post({
      destinationId: destinationFolderId,
    });

    return movedMessage as GraphMessage;
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new Error(`Message not found: ${messageId}`);
    }
    throw new Error(`Failed to move message: ${error.message}`);
  }
}

/**
 * Lists all mail folders in the mailbox
 */
export async function listFolders(client: Client): Promise<GraphFolder[]> {
  try {
    const response = await client.api("/me/mailFolders").get();

    const folders = response.value as GraphFolder[];

    return folders;
  } catch (error: any) {
    throw new Error(`Failed to fetch folders: ${error.message}`);
  }
}
