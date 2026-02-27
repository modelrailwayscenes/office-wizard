import type { ActionOptions } from "gadget-server";
import crypto from "node:crypto";
import { getMicrosoftGraphClient } from "../lib/microsoftGraph";
import { evaluateFinanceRules } from "../lib/finance/rules";

export const params = {
  maxMessages: { type: "number" },
  folder: { type: "string" },
};

const INVOICE_HINTS = ["invoice", "receipt", "vat", "statement"];

const parseInvoiceNumber = (subject: string, bodyExcerpt: string) => {
  const text = `${subject} ${bodyExcerpt}`;
  const match =
    text.match(/\b(?:inv|invoice)[\s#:.-]*([A-Z0-9-]{4,})\b/i) ||
    text.match(/\b([A-Z]{2,}-\d{3,})\b/);
  return match?.[1] || null;
};

const parseAmount = (subject: string, bodyExcerpt: string): number | null => {
  const text = `${subject} ${bodyExcerpt}`;
  const amountMatch = text.match(/£\s?(\d+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const n = Number(amountMatch[1]);
  return Number.isFinite(n) ? n : null;
};

const hashContent = (input: string) => crypto.createHash("sha256").update(input).digest("hex");

export const run: ActionRun = async ({ api, params }) => {
  const maxMessages = Math.max(1, Math.min(100, Number(params?.maxMessages || 30)));
  const folder = String(params?.folder || "Inbox");

  const config = await api.appConfiguration.findFirst({
    select: {
      id: true,
      microsoftAccessToken: true,
      microsoftTokenExpiresAt: true,
      microsoftConnectionStatus: true,
    } as any,
  });

  if (!config?.id || config?.microsoftConnectionStatus !== "connected") {
    throw new Error("Microsoft 365 is not connected");
  }

  let accessToken = String((config as any).microsoftAccessToken || "");
  const expiresAt = config.microsoftTokenExpiresAt ? new Date(config.microsoftTokenExpiresAt).getTime() : 0;
  if (!accessToken || expiresAt < Date.now() + 60_000) {
    const refreshed = await api.refreshAccessToken();
    if (!refreshed?.success) {
      throw new Error(refreshed?.error || "Unable to refresh Microsoft access token");
    }
    const configAfterRefresh = await api.appConfiguration.findFirst({
      select: { microsoftAccessToken: true } as any,
    });
    accessToken = String((configAfterRefresh as any)?.microsoftAccessToken || "");
  }
  if (!accessToken) throw new Error("Microsoft access token unavailable");

  const client = getMicrosoftGraphClient(accessToken);
  const folders = await client.api("/me/mailFolders").get();
  const folderNode = (folders?.value || []).find(
    (f: any) => String(f.displayName || "").toLowerCase() === folder.toLowerCase()
  );
  const folderId = folderNode?.id || "inbox";

  const response = await client
    .api(`/me/mailFolders/${folderId}/messages`)
    .query({
      $top: maxMessages,
      $orderby: "receivedDateTime desc",
      $select: "id,subject,from,toRecipients,receivedDateTime,bodyPreview,internetMessageId,hasAttachments",
    })
    .get();

  const messages = Array.isArray(response?.value) ? response.value : [];
  let createdMessages = 0;
  let createdDocs = 0;
  let createdLedgerEntries = 0;
  let duplicateCandidates = 0;

  for (const message of messages) {
    const subject = String(message?.subject || "");
    const bodyExcerpt = String(message?.bodyPreview || "").slice(0, 800);
    const lowered = `${subject} ${bodyExcerpt}`.toLowerCase();
    const hasInvoiceHint = INVOICE_HINTS.some((hint) => lowered.includes(hint));
    if (!hasInvoiceHint && !message?.hasAttachments) continue;

    const m365MessageId = String(message?.id || "");
    if (!m365MessageId) continue;
    const messageKey = `m365:${m365MessageId}`;

    const existingMessage = await api.financeEmailMessage.findFirst({
      filter: { messageKey: { equals: messageKey } },
      select: { id: true },
    } as any);

    const fromAddress = String(message?.from?.emailAddress?.address || "");
    const toAddress = Array.isArray(message?.toRecipients)
      ? message.toRecipients
          .map((r: any) => String(r?.emailAddress?.address || ""))
          .filter(Boolean)
          .join(", ")
      : "";

    let financeEmailMessageId = existingMessage?.id || null;
    if (!existingMessage?.id) {
      const createdMsg = await api.financeEmailMessage.create({
        m365MessageId,
        messageKey,
        subject,
        fromAddress: fromAddress || undefined,
        toAddress,
        receivedAt: message?.receivedDateTime || new Date().toISOString(),
        folderPath: folder,
        bodyExcerpt,
        headersSnapshot: { internetMessageId: message?.internetMessageId || null },
        attachmentIdsJson: [],
      } as any);
      financeEmailMessageId = createdMsg?.id || null;
      createdMessages++;
    }

    let attachmentIds: string[] = [];
    if (message?.hasAttachments) {
      const attachmentsResponse = await client
        .api(`/me/messages/${m365MessageId}/attachments`)
        .query({ $top: 15, $select: "id,name,contentType,size,lastModifiedDateTime,contentBytes" })
        .get();
      const attachments = Array.isArray(attachmentsResponse?.value) ? attachmentsResponse.value : [];

      for (const att of attachments) {
        const attachmentId = String(att?.id || "");
        if (!attachmentId) continue;
        attachmentIds.push(attachmentId);
        const contentBytes = String(att?.contentBytes || "");
        const filename = String(att?.name || "attachment");
        const mime = String(att?.contentType || "application/octet-stream");
        const digest = hashContent(`${m365MessageId}:${attachmentId}:${filename}:${contentBytes.slice(0, 128)}`);
        const documentKey = `m365:${m365MessageId}:${attachmentId}`;

        const existingDoc = await api.financeDocument.findFirst({
          filter: { documentKey: { equals: documentKey } },
          select: { id: true },
        } as any);
        if (!existingDoc?.id) {
          await api.financeDocument.create({
            type: "invoice",
            filename,
            mime,
            fileHashSha256: digest,
            storageUri: `m365://${m365MessageId}/${attachmentId}`,
            capturedAt: new Date().toISOString(),
            source: "m365_email",
            sourceRef: m365MessageId,
            documentKey,
            supplierName: fromAddress || null,
            amount: parseAmount(subject, bodyExcerpt),
            invoiceNumber: parseInvoiceNumber(subject, bodyExcerpt),
          } as any);
          createdDocs++;
        }
      }
    }

    if (financeEmailMessageId) {
      await api.financeEmailMessage.update(financeEmailMessageId, {
        attachmentIdsJson: attachmentIds,
      } as any);
    }

    const invoiceNumber = parseInvoiceNumber(subject, bodyExcerpt);
    const amount = parseAmount(subject, bodyExcerpt);
    const categorisationRules = await api.financeRule.findMany({
      first: 100,
      filter: { scope: { equals: "categorisation" }, enabled: { equals: true } } as any,
      sort: { priority: "Ascending" } as any,
      select: { id: true, name: true, conditions: true, actions: true, stopProcessing: true } as any,
    });
    const approvalRules = await api.financeRule.findMany({
      first: 100,
      filter: { scope: { equals: "approval" }, enabled: { equals: true } } as any,
      sort: { priority: "Ascending" } as any,
      select: { id: true, name: true, conditions: true, actions: true, stopProcessing: true } as any,
    });
    const categorisationMatches = evaluateFinanceRules(categorisationRules || [], {
      subject,
      bodyExcerpt,
      fromAddress,
      amount,
    });
    const approvalMatches = evaluateFinanceRules(approvalRules || [], {
      subject,
      bodyExcerpt,
      fromAddress,
      amount,
    });
    const categoryName = String(categorisationMatches?.[0]?.actions?.setCategoryName || "");
    const autoApproveByRule = approvalMatches.some((m) => Boolean(m.actions?.autoApprove));

    const trustedCounterparty = await api.financeCounterparty.findFirst({
      filter: {
        OR: [{ name: { equals: fromAddress } }, { aliases: { contains: fromAddress } }],
      } as any,
      select: { id: true, trustedSupplier: true } as any,
    });
    const shouldAutoApprove = Boolean(autoApproveByRule || trustedCounterparty?.trustedSupplier);
    let categoryId: string | null = null;
    if (categoryName) {
      const cat = await api.financeCategory.findFirst({
        filter: { name: { equals: categoryName } },
        select: { id: true },
      } as any);
      categoryId = cat?.id || null;
    }
    const duplicateLookup =
      invoiceNumber &&
      (await api.financeDocument.findFirst({
        filter: {
          AND: [
            { invoiceNumber: { equals: invoiceNumber } },
            ...(fromAddress ? [{ supplierName: { equals: fromAddress } }] : []),
          ],
        },
        select: { id: true, sourceRef: true },
      } as any));

    if (duplicateLookup?.id) {
      const duplicateKey = `dup:${fromAddress}:${invoiceNumber}`;
      const existingDup = await api.financeDuplicateCandidate.findFirst({
        filter: { duplicateKey: { equals: duplicateKey } },
        select: { id: true },
      } as any);
      if (!existingDup?.id) {
        await api.financeDuplicateCandidate.create({
          duplicateKey,
          supplierName: fromAddress || null,
          invoiceNumber,
          amount,
          status: "pending_review",
          reasonJson: {
            reasons: ["invoice_number_match", fromAddress ? "supplier_match" : "invoice_number_only"],
            confidence: fromAddress ? 0.98 : 0.9,
          },
          sourceDocumentRef: `m365:${m365MessageId}`,
          existingDocumentRef: duplicateLookup.sourceRef || duplicateLookup.id,
        } as any);
        duplicateCandidates++;
      }
      continue;
    }

    const existingLedger = await api.financeLedgerEntry.findFirst({
      filter: {
        AND: [
          { createdFrom: { equals: "email_ingest" } },
          { description: { equals: subject || "Invoice from email" } },
          ...(amount ? [{ grossAmount: { equals: amount } }] : []),
        ],
      },
      select: { id: true },
    } as any);
    if (!existingLedger?.id) {
      await api.financeLedgerEntry.create({
        entryDate: message?.receivedDateTime || new Date().toISOString(),
        direction: "expense",
        description: subject || "Invoice from email",
        grossAmount: amount || 0,
        currency: "GBP",
        paymentStatus: "unpaid",
        status: shouldAutoApprove ? "approved" : "needs_approval",
        createdFrom: "email_ingest",
        linkedDocumentIdsJson: attachmentIds.map((id) => `m365:${m365MessageId}:${id}`),
        category: categoryId ? { _link: categoryId } : undefined,
      } as any);
      createdLedgerEntries++;
    }
  }

  await api.financeAuditLog.create({
    entityType: "finance_ingest",
    entityId: `email:${new Date().toISOString()}`,
    action: "email_ingest_run",
    actorEmail: "system",
    reason: "scheduled_or_manual_ingest",
    beforeState: {},
    afterState: {
      scanned: messages.length,
      createdMessages,
      createdDocs,
      createdLedgerEntries,
      duplicateCandidates,
    },
    metadata: { folder, maxMessages },
    occurredAt: new Date().toISOString(),
  } as any);

  return {
    ok: true,
    createdMessages,
    createdDocs,
    createdLedgerEntries,
    duplicateCandidates,
    scanned: messages.length,
  };
};

export const options: ActionOptions = {};
