import crypto from "node:crypto";

export function verifyShopifyWebhookHmac({
  rawBody,
  hmacHeader,
  secret,
}: {
  rawBody: string;
  hmacHeader?: string | null;
  secret?: string | null;
}) {
  if (!secret) return false;
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(hmacHeader)));
  } catch {
    return false;
  }
}

export function getShopifyTopic(headers: Record<string, any>) {
  return String(headers["x-shopify-topic"] || headers["X-Shopify-Topic"] || "").toLowerCase();
}
