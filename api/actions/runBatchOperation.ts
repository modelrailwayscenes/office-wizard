// api/actions/runBatchOperation.ts

import { ActionOptions } from "gadget-server";

/**
 * runBatchOperation
 *
 * Performs batch operations driven primarily by emailMessage IDs (preferred).
 * Supported actions:
 * - send: Send AI-generated or existing draft responses
 * - save_drafts: Save AI responses as drafts (don't send)
 * - resolve: Mark conversations as resolved
 * - archive: Archive conversations
 * - assign: Assign conversations to a user
 * - reject: Mark as rejected (implemented as archive + batchResultStatus = "rejected")
 * - move: Move by setting currentCategory (requires currentCategory field on conversation)
 *
 * Also supports draft overrides via draftsByEmailId (JSON object mapping emailMessageId -> draft text).
 *
 * Also writes an aiComment audit trail record (aiComment model) per conversation.
 */

export const params = {
  batchId: { type: "string" },
  action: { type: "string" }, // send | save_drafts | resolve | archive | assign | reject | move
  type: { type: "string" }, // tracking | refund | product_question | etc.
  label: { type: "string" }, // Tracking Requests
  conversationIds: { type: "string" }, // JSON array of conversation IDs (fallback)
  emailIds: { type: "string" }, // JSON array of emailMessage IDs (preferred)
  draftsByEmailId: { type: "string" }, // JSON object { [emailMessageId]: "draft text" }
  notes: { type: "string" },
  assignToUserId: { type: "string" },
  moveToCategory: { type: "string" },
  estimatedTimeSaved: { type: "number" },
  userId: { type: "string" },
  templateUsed: { type: "string" },
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

const parseDraftsMap = (raw: unknown): Record<string, string> => {
  if (raw == null || raw === "") return {};
  if (typeof raw !== "string") throw new Error(`draftsByEmailId must be a JSON string`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON in draftsByEmailId");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("draftsByEmailId must be a JSON object");
  }

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as any)) {
    if (typeof k === "string" && typeof v === "string") out[k] = v;
  }
  return out;
};

export const run = async (context: any) => {
  const { params, api, logger } = context;

  const batchId: string | undefined = params.batchId;
  const action: string | undefined = params.action;
  const type: string = params.type || "general";
  const label: string = params.label || "Batch Operation";
  const notes: string | undefined = params.notes;
  const assignToUserId: string | undefined = params.assignToUserId;
  const moveToCategory: string | undefined = params.moveToCategory;
  const estimatedTimeSaved: number = typeof params.estimatedTimeSaved === "number" ? params.estimatedTimeSaved : 0;
  const userId: string | undefined = params.userId;
  const templateUsed: string | undefined = params.templateUsed;

  const conversationIds = parseStringArrayParam(params.conversationIds, "conversationIds");
  const emailIds = parseStringArrayParam(params.emailIds, "emailIds");
  const draftsByEmailId = parseDraftsMap(params.draftsByEmailId);

  if (conversationIds.length === 0 && emailIds.length === 0) {
    throw new Error("At least one conversationId or emailId is required");
  }

  if (!action) {
    throw new Error("action is required (send, save_drafts, resolve, archive, assign, reject, move)");
  }

  const supported = new Set(["send", "save_drafts", "resolve", "archive", "assign", "reject", "move"]);
  if (!supported.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  logger.info(
    { action, type, conversationCount: conversationIds.length, emailCount: emailIds.length },
    "Starting batch operation"
  );

  // Small helper: best-effort aiComment write
  const writeBatchComment = async (opts: {
    conversationId: string;
    batchOperationId: string;
    status: string;
    content: string;
    error?: string | null;
    extraMeta?: Record<string, any>;
  }) => {
    try {
      await api.internal.aiComment.create({
        conversation: { _link: opts.conversationId },
        batchOperation: { _link: opts.batchOperationId },
        kind: "batch_result",
        source: "batch",
        content: opts.content,
        model: null,
        metaJson: JSON.stringify({
          action,
          type,
          label,
          status: opts.status,
          error: opts.error || null,
          notes: notes || null,
          templateUsed: templateUsed || null,
          assignToUserId: assignToUserId || null,
          moveToCategory: moveToCategory || null,
          estimatedTimeSaved,
          userId: userId || null,
          ...((opts.extraMeta as any) || {}),
        }),
      });
    } catch (err: any) {
      logger.warn({ conversationId: opts.conversationId, error: err?.message }, "Failed to write aiComment batch record");
    }
  };

  // ── Create batchOperation record ───────────────────────────────────
  const opId = batchId || `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Keep aligned with your actual batchOperation schema fields
  const batchOp = await api.internal.batchOperation.create({
    batchId: opId,
    type,
    label,
    action,
    status: "in_progress",
    emailCount: emailIds.length || conversationIds.length,
    sentCount: 0,
    savedCount: 0,
    errorCount: 0,
    timeSaved: estimatedTimeSaved,
    notes: notes || null,
    createdBy: userId || null,
    user: userId ? { _link: userId } : undefined,
    templateUsed: templateUsed || null,
  });

  // ── Resolve conversation ids from email ids (preferred) ─────────────
  let effectiveConversationIds: string[] = [...conversationIds];

  // Also build a mapping emailId -> conversationId for draft overrides
  const emailToConversation: Record<string, string> = {};

  if (emailIds.length > 0) {
    const emails = await api.internal.emailMessage.findMany({
      filter: { id: { in: emailIds } },
      select: { id: true, conversation: { id: true } },
    });

    const convs: string[] = [];
    for (const e of emails as any[]) {
      const eid = e?.id;
      const cid = e?.conversation?.id;
      if (typeof eid === "string" && typeof cid === "string") {
        emailToConversation[eid] = cid;
        convs.push(cid);
      }
    }

    // If user didn't pass conversationIds, use the ones we found
    if (effectiveConversationIds.length === 0) {
      effectiveConversationIds = [...new Set(convs)];
    }
  }

  // Draft overrides: build conversationId -> draft (last one wins)
  const draftByConversationId: Record<string, string> = {};
  for (const [emailId, draft] of Object.entries(draftsByEmailId)) {
    const cid = emailToConversation[emailId];
    if (cid) draftByConversationId[cid] = draft;
  }

  // Fetch Microsoft access token
  const config = await api.internal.appConfiguration.findFirst({
    select: { id: true, microsoftAccessToken: true },
  });

  // ── Process each conversation ──────────────────────────────────────
  let sentCount = 0;
  let savedCount = 0;
  let errorCount = 0;

  const results: Array<{ conversationId: string; status: string; error?: string }> = [];

  for (const convId of effectiveConversationIds) {
    try {
      // Apply draft override (if provided)
      const overrideDraft = draftByConversationId[convId];
      if (typeof overrideDraft === "string" && overrideDraft.trim().length > 0) {
        await api.internal.conversation.update(convId, {
          aiDraftContent: overrideDraft,
          aiDraftGeneratedAt: new Date().toISOString(),
        });

        await writeBatchComment({
          conversationId: convId,
          batchOperationId: batchOp.id,
          status: "draft_override_applied",
          content: `Draft override applied for this batch operation (length ${overrideDraft.length}).`,
          extraMeta: { overrideDraftLength: overrideDraft.length },
        });
      }

      switch (action) {
        case "send": {
          const conversation = await api.internal.conversation.findOne(convId, {
            select: {
              id: true,
              primaryCustomerEmail: true,
              subject: true,
              aiDraftContent: true,
              aiGeneratedResponse: true,
            },
          });

          const responseBody = conversation.aiDraftContent || conversation.aiGeneratedResponse;

          if (!responseBody) {
            await api.internal.conversation.update(convId, {
              batchOperation: { _link: batchOp.id },
              batchResultStatus: "error",
            });

            await writeBatchComment({
              conversationId: convId,
              batchOperationId: batchOp.id,
              status: "error",
              content: "Batch send failed: no draft or AI response was available to send.",
              error: "No draft or AI response found",
            });

            errorCount++;
            results.push({ conversationId: convId, status: "error", error: "No draft or AI response found" });
            break;
          }

          if (!config?.microsoftAccessToken) {
            await api.internal.conversation.update(convId, {
              batchOperation: { _link: batchOp.id },
              batchResultStatus: "error",
            });

            await writeBatchComment({
              conversationId: convId,
              batchOperationId: batchOp.id,
              status: "error",
              content: "Batch send failed: Microsoft access token not configured.",
              error: "No Microsoft access token found",
            });

            errorCount++;
            results.push({ conversationId: convId, status: "error", error: "No Microsoft access token found" });
            break;
          }

          try {
            const accessToken = config.microsoftAccessToken;

            const sendResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  subject: conversation.subject ? `Re: ${conversation.subject}` : "Re: Your enquiry",
                  body: {
                    contentType: "HTML",
                    content: String(responseBody).replace(/\n/g, "<br>"),
                  },
                  toRecipients: [
                    {
                      emailAddress: {
                        address: conversation.primaryCustomerEmail,
                      },
                    },
                  ],
                },
              }),
            });

            if (!sendResponse.ok) {
              const errorText = await sendResponse.text();
              throw new Error(`Graph API error: ${sendResponse.status} - ${errorText}`);
            }

            await api.internal.conversation.update(convId, {
              batchOperation: { _link: batchOp.id },
              batchResultStatus: "sent",
              status: "waiting_customer",
            });

            await writeBatchComment({
              conversationId: convId,
              batchOperationId: batchOp.id,
              status: "sent",
              content: "Batch send succeeded: email sent via Microsoft Graph.",
              extraMeta: { recipient: conversation.primaryCustomerEmail || null },
            });

            sentCount++;
            results.push({ conversationId: convId, status: "sent" });
          } catch (sendErr: any) {
            logger.error({ convId, error: sendErr?.message }, "Failed to send email");

            await api.internal.conversation.update(convId, {
              batchOperation: { _link: batchOp.id },
              batchResultStatus: "error",
            });

            await writeBatchComment({
              conversationId: convId,
              batchOperationId: batchOp.id,
              status: "error",
              content: "Batch send failed while calling Microsoft Graph.",
              error: sendErr?.message || "Send failed",
            });

            errorCount++;
            results.push({ conversationId: convId, status: "error", error: sendErr?.message || "Send failed" });
          }

          break;
        }

        case "save_drafts": {
          await api.internal.conversation.update(convId, {
            batchOperation: { _link: batchOp.id },
            batchResultStatus: "draft",
            status: "in_progress",
          });

          await writeBatchComment({
            conversationId: convId,
            batchOperationId: batchOp.id,
            status: "draft",
            content: "Batch action completed: marked as draft (saved for later review/sending).",
          });

          savedCount++;
          results.push({ conversationId: convId, status: "draft" });
          break;
        }

        case "resolve": {
          await api.internal.conversation.update(convId, {
            batchOperation: { _link: batchOp.id },
            batchResultStatus: "resolved",
            status: "resolved",
            resolvedAt: new Date().toISOString(),
          });

          await writeBatchComment({
            conversationId: convId,
            batchOperationId: batchOp.id,
            status: "resolved",
            content: "Batch action completed: conversation marked as resolved.",
          });

          sentCount++;
          results.push({ conversationId: convId, status: "resolved" });
          break;
        }

        case "archive": {
          await api.internal.conversation.update(convId, {
            batchOperation: { _link: batchOp.id },
            batchResultStatus: "archived",
            archivedAt: new Date().toISOString(),
          });

          await writeBatchComment({
            conversationId: convId,
            batchOperationId: batchOp.id,
            status: "archived",
            content: "Batch action completed: conversation archived.",
          });

          sentCount++;
          results.push({ conversationId: convId, status: "archived" });
          break;
        }

        case "reject": {
          // Implemented as archive + explicit batchResultStatus so you can filter/report.
          await api.internal.conversation.update(convId, {
            batchOperation: { _link: batchOp.id },
            batchResultStatus: "rejected",
            archivedAt: new Date().toISOString(),
          });

          await writeBatchComment({
            conversationId: convId,
            batchOperationId: batchOp.id,
            status: "rejected",
            content: "Batch action completed: conversation rejected (archived with rejected status).",
          });

          sentCount++;
          results.push({ conversationId: convId, status: "rejected" });
          break;
        }

        case "move": {
          if (!moveToCategory || !moveToCategory.trim()) {
            await writeBatchComment({
              conversationId: convId,
              batchOperationId: batchOp.id,
              status: "error",
              content: "Batch move failed: moveToCategory not provided.",
              error: "No moveToCategory specified",
            });

            errorCount++;
            results.push({ conversationId: convId, status: "error", error: "No moveToCategory specified" });
            break;
          }

          await api.internal.conversation.update(convId, {
            batchOperation: { _link: batchOp.id },
            batchResultStatus: "moved",
            currentCategory: moveToCategory,
          });

          await writeBatchComment({
            conversationId: convId,
            batchOperationId: batchOp.id,
            status: "moved",
            content: `Batch action completed: conversation moved to category "${moveToCategory}".`,
            extraMeta: { moveToCategory },
          });

          sentCount++;
          results.push({ conversationId: convId, status: "moved" });
          break;
        }

        case "assign": {
          if (!assignToUserId) {
            await writeBatchComment({
              conversationId: convId,
              batchOperationId: batchOp.id,
              status: "error",
              content: "Batch assign failed: no assignee specified.",
              error: "No assignee specified",
            });

            errorCount++;
            results.push({ conversationId: convId, status: "error", error: "No assignee specified" });
            break;
          }

          await api.internal.conversation.update(convId, {
            batchOperation: { _link: batchOp.id },
            batchResultStatus: "assigned",
            assignedTo: { _link: assignToUserId },
          });

          await writeBatchComment({
            conversationId: convId,
            batchOperationId: batchOp.id,
            status: "assigned",
            content: "Batch action completed: conversation assigned to user.",
            extraMeta: { assignToUserId },
          });

          sentCount++;
          results.push({ conversationId: convId, status: "assigned" });
          break;
        }
      }
    } catch (err: any) {
      logger.error({ convId, error: err?.message }, "Error processing conversation in batch");

      await writeBatchComment({
        conversationId: convId,
        batchOperationId: batchOp.id,
        status: "error",
        content: "Batch operation encountered an unexpected error while processing this conversation.",
        error: err?.message || "Unknown error",
      });

      errorCount++;
      results.push({ conversationId: convId, status: "error", error: err?.message || "Unknown error" });
    }
  }

  // ── Finalize batchOperation record ─────────────────────────────────
  const total = effectiveConversationIds.length;

  const finalStatus = total > 0 && errorCount === total ? "failed" : errorCount > 0 ? "partial" : "completed";

  await api.internal.batchOperation.update(batchOp.id, {
    status: finalStatus,
    sentCount,
    savedCount,
    errorCount,
    completedAt: new Date().toISOString(),
    timeSaved: estimatedTimeSaved,
  });

  logger.info({ batchId: opId, status: finalStatus, sentCount, savedCount, errorCount }, "Batch operation complete");

  return {
    batchId: opId,
    batchOperationId: batchOp.id,
    status: finalStatus,
    total,
    sentCount,
    savedCount,
    errorCount,
    timeSaved: estimatedTimeSaved,
    results,
  };
};

export const options: ActionOptions = {
  // Manual global action
};