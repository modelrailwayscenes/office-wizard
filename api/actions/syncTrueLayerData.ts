import type { ActionOptions } from "gadget-server";

const truelayerApi = async (path: string, accessToken: string) => {
  const response = await fetch(`https://api.truelayer.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error_description || json?.error || `TrueLayer call failed: ${path}`);
  return json;
};

const refreshTrueLayerToken = async (api: any, config: any) => {
  const clientId = String(config?.trueLayerClientId || process.env.TRUELAYER_CLIENT_ID || "");
  const clientSecret = String(config?.trueLayerClientSecret || process.env.TRUELAYER_CLIENT_SECRET || "");
  const refreshToken = String(config?.trueLayerRefreshToken || "");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing TrueLayer refresh credentials");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch("https://auth.truelayer.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "TrueLayer refresh failed");
  }

  const expiresAt = new Date(Date.now() + Number(payload?.expires_in || 0) * 1000);
  await api.appConfiguration.update(config.id, {
    trueLayerAccessToken: payload?.access_token || null,
    trueLayerRefreshToken: payload?.refresh_token || refreshToken,
    trueLayerTokenExpiresAt: expiresAt,
    trueLayerConnectionStatus: "connected",
  } as any);
  return String(payload?.access_token || "");
};

export const run: ActionRun = async ({ api }) => {
  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      trueLayerAccessToken: true,
      trueLayerRefreshToken: true,
      trueLayerTokenExpiresAt: true,
      trueLayerClientId: true,
      trueLayerClientSecret: true,
    } as any,
  });
  if (!config?.id) throw new Error("Missing app configuration");

  let accessToken = String((config as any)?.trueLayerAccessToken || "");
  const tokenExpiry = config?.trueLayerTokenExpiresAt ? new Date(config.trueLayerTokenExpiresAt).getTime() : 0;
  if (!accessToken || tokenExpiry < Date.now() + 60_000) {
    accessToken = await refreshTrueLayerToken(api, config);
  }
  if (!accessToken) throw new Error("No TrueLayer access token");

  const accountsPayload = await truelayerApi("/data/v1/accounts", accessToken);
  const accounts = Array.isArray(accountsPayload?.results) ? accountsPayload.results : [];

  let accountsUpserted = 0;
  let transactionsUpserted = 0;

  for (const account of accounts) {
    const providerAccountId = String(account?.account_id || "");
    if (!providerAccountId) continue;
    const displayName = String(account?.display_name || account?.account_type || "Open Banking Account");
    const identifierMasked =
      String(account?.account_number?.iban || account?.account_number?.number || "")
        .slice(-4)
        .padStart(4, "•");

    const existing = await api.financeAccount.findFirst({
      filter: { providerAccountId: { equals: providerAccountId } },
      select: { id: true, syncCursor: true },
    } as any);
    const accountData = {
      provider: "open_banking",
      source: "halifax",
      displayName,
      accountIdentifierMasked: identifierMasked || null,
      currency: String(account?.currency || "GBP"),
      status: "active",
      providerAccountId,
      lastSyncedAt: new Date().toISOString(),
    };
    let financeAccountId = existing?.id;
    if (financeAccountId) {
      await api.financeAccount.update(financeAccountId, accountData as any);
    } else {
      const created = await api.financeAccount.create(accountData as any);
      financeAccountId = created?.id;
    }
    accountsUpserted++;

    const transactionsPayload = await truelayerApi(
      `/data/v1/accounts/${encodeURIComponent(providerAccountId)}/transactions`,
      accessToken
    );
    const transactions = Array.isArray(transactionsPayload?.results) ? transactionsPayload.results : [];
    for (const tx of transactions) {
      const sourceTxnId = String(tx?.transaction_id || tx?.normalised_provider_transaction_id || "");
      if (!sourceTxnId) continue;
      const sourceUniqueRef = `truelayer:${providerAccountId}:${sourceTxnId}`;
      const existingTxn = await api.financeTransaction.findFirst({
        filter: { sourceUniqueRef: { equals: sourceUniqueRef } },
        select: { id: true },
      } as any);
      const txnData = {
        account: financeAccountId ? { _link: financeAccountId } : undefined,
        source: "halifax",
        sourceTxnId,
        sourceUniqueRef,
        postedAt: tx?.timestamp || tx?.update_timestamp || new Date().toISOString(),
        amount: Number(tx?.amount || 0),
        currency: String(tx?.currency || "GBP"),
        counterpartyRaw: String(tx?.merchant_name || tx?.description || ""),
        descriptionRaw: String(tx?.description || ""),
        status: "imported",
        rawPayload: tx,
      };
      if (existingTxn?.id) {
        await api.financeTransaction.update(existingTxn.id, txnData as any);
      } else {
        await api.financeTransaction.create(txnData as any);
      }
      transactionsUpserted++;
    }
  }

  await api.appConfiguration.update(config.id, {
    trueLayerLastSyncedAt: new Date().toISOString(),
    trueLayerConnectionStatus: "connected",
  } as any);
  await api.financeAuditLog.create({
    entityType: "finance_ingest",
    entityId: `truelayer:${new Date().toISOString()}`,
    action: "truelayer_sync",
    actorEmail: "system",
    reason: "manual_or_scheduled_sync",
    beforeState: {},
    afterState: { accountsUpserted, transactionsUpserted },
    metadata: { provider: "truelayer" },
    occurredAt: new Date().toISOString(),
  } as any);

  return { ok: true, accountsUpserted, transactionsUpserted };
};

export const options: ActionOptions = {};
