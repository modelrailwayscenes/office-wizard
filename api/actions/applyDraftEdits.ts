// api/actions/applyDraftEdits.ts
import { ActionOptions } from "gadget-server";

/**
 * applyDraftEdits
 *
 * Persists edited drafts keyed by emailMessage id.
 * - params.emailIds: JSON string array of emailMessage IDs
 * - params.draftsByEmailId: JSON string object mapping emailMessageId -> edited draft text
 *
 * For each emailMessage:
 *   - resolves the related conversation
 *   - updates conversation.aiDraftContent (+ timestamps)
 *
 * Deploy to: /api/actions/applyDraftEdits.ts
 */

export const params = {
  emailIds: { type: "string" }, // JSON array of emailMessage ids
  draftsByEmailId: { type: "string" }, // JSON object { [emailMessageId]: "draft text" }
  regenerate: { type: "boolean" }, // optional (unused here, but handy later)
};

const parseStringArrayParam = (raw: unknown, fieldName: string): string[] => {
  if (raw == null || raw === "") return [];
  if (typeof raw !== "string") throw new Error(`${fieldName} must be a JSON string`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${fieldName}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${fieldName} must be a JSON array`);
  return parsed.filter((v) => typeof v === "string") as string[];
};

const parseDraftMapParam = (raw: unknown, fieldName: string): Record<string, string> => {
  if (raw == null || raw === "") return {};
  if (typeof raw !== "string") throw new Error(`${fieldName} must be a JSON string`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${fieldName}`);
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON object`);
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof k === "string" && typeof v === "string") out[k] = v;
  }
  return out;
};

export const run = async (context: any) => {
  const { params, api, logger } = context;

  const emailIds = parseStringArrayParam(params.emailIds, "emailIds");
  const draftsByEmailId = parseDraftMapParam(params.draftsByEmailId, "draftsByEmailId");

  if (emailIds.length === 0) {
    throw new Error("emailIds is required (non-empty JSON array)");
  }

  // Load messages + conversation links in one query
  const messages = await api.internal.emailMessage.findMany({
    filter: { id: { in: emailIds } },
    select: {
      id: true,
      conversation: { id: true },
    },
  });

  const nowIso = new Date().toISOString();

  let updated = 0;
  const skipped: Array<{ emailId: string; reason: string }> = [];

  for (const msg of messages) {
    const emailId = msg.id;
    const convId = msg?.conversation?.id;

    if (!convId) {
      skipped.push({ emailId, reason: "No conversation linked" });
      continue;
    }

    const draft = draftsByEmailId[emailId];
    if (typeof draft !== "string") {
      skipped.push({ emailId, reason: "No draft provided for this emailId" });
      continue;
    }

    // Persist edited draft to the conversation draft fields
    await api.internal.conversation.update(convId, {
      aiDraftContent: draft,
      aiDraftGeneratedAt: nowIso,
      // Keep it in the human review bucket until user sends/resolves/rejects.
      requiresHumanReview: true,
    });

    updated++;
  }

  logger.info({ updated, skippedCount: skipped.length }, "applyDraftEdits complete");

  return {
    emailIdsCount: emailIds.length,
    updated,
    skipped,
  };
};

export const options: ActionOptions = {};