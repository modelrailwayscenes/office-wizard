import { useMemo } from "react";

import { parseEmailContent } from "@/lib/emailContent";

export function EmailMessageBody({
  bodyHtml,
  bodyText,
  bodyPreview,
}: {
  bodyHtml?: string | null;
  bodyText?: string | null;
  bodyPreview?: string | null;
}) {
  const parsed = useMemo(
    () =>
      parseEmailContent({
        rawHtml: bodyHtml,
        rawText: bodyText,
        bodyPreview,
      }),
    [bodyHtml, bodyText, bodyPreview]
  );

  const hasMain = Boolean(parsed.bodyMain);
  const hasQuoted = parsed.quotedBlocks.length > 0;
  const hasSignature = Boolean(parsed.signatureBlock);

  if (!hasMain && !hasQuoted && !hasSignature) {
    return <p className="text-sm text-muted-foreground italic">No message content available.</p>;
  }

  return (
    <div className="space-y-3">
      {hasMain && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
          {parsed.bodyMain}
        </div>
      )}

      {hasQuoted && (
        <details className="rounded-lg border border-border bg-card/40 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Quoted history ({parsed.quotedBlocks.length})
          </summary>
          <div className="mt-2 space-y-2">
            {parsed.quotedBlocks.map((block, idx) => (
              <div key={idx} className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {block}
              </div>
            ))}
          </div>
        </details>
      )}

      {hasSignature && (
        <details className="rounded-lg border border-border bg-card/40 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Signature</summary>
          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{parsed.signatureBlock}</div>
        </details>
      )}
    </div>
  );
}
