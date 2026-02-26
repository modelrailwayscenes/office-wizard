export type ParsedEmailContent = {
  rawHtml: string;
  rawText: string;
  normalizedText: string;
  quotedBlocks: string[];
  signatureBlock: string | null;
  bodyMain: string;
  sanitizedHtml: string;
};

const SAFE_TAGS = new Set(["p", "br", "a", "strong", "em", "ul", "ol", "li", "blockquote"]);
const CLOSING_PATTERNS = [/^\s*(regards|best|thanks|thank you|cheers|sincerely)\b/i];
const SIGNATURE_SEPARATORS = [/^\s*--\s*$/, /^\s*___+\s*$/, /^\s*sent from my (iphone|android|mobile).*/i];
const INLINE_REPLY_MARKER = /\nOn .+wrote:\n/i;

function stripTags(input: string) {
  return input.replace(/<[^>]*>/g, " ");
}

function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function sanitizeHtml(rawHtml: string) {
  if (!rawHtml) return "";
  if (typeof window === "undefined") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  // Remove dangerous top-level tags
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((el) => el.remove());

  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();

    if (!SAFE_TAGS.has(tag)) {
      const textNode = doc.createTextNode(el.textContent || "");
      el.replaceWith(textNode);
      return;
    }

    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }
      if (tag === "a" && name === "href") {
        const safe = /^(https?:|mailto:)/i.test(value || "");
        if (!safe) {
          el.removeAttribute("href");
        } else {
          el.setAttribute("rel", "noopener noreferrer");
          el.setAttribute("target", "_blank");
        }
        return;
      }
      if (name !== "href") {
        el.removeAttribute(attr.name);
      }
    });

    [...el.children].forEach((child) => walk(child));
  };

  [...doc.body.children].forEach((child) => walk(child));
  return doc.body.innerHTML;
}

function detectQuotedBlocks(sanitizedHtml: string, fallbackText: string) {
  const quotedBlocks: string[] = [];
  let mainText = fallbackText;

  if (typeof window !== "undefined" && sanitizedHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, "text/html");
    const blockquotes = [...doc.querySelectorAll("blockquote")];
    for (const block of blockquotes) {
      const text = normalizeText(block.textContent || "");
      if (text) quotedBlocks.push(text);
      block.remove();
    }
    const blockquoteStrippedText = normalizeText(doc.body.textContent || "");
    if (blockquoteStrippedText) {
      mainText = blockquoteStrippedText;
    }
  }

  const markerSplit = mainText.split(INLINE_REPLY_MARKER);
  if (markerSplit.length > 1) {
    const main = markerSplit[0];
    const quoted = markerSplit.slice(1).join("\nOn ... wrote:\n");
    if (normalizeText(quoted)) quotedBlocks.push(normalizeText(quoted));
    mainText = main;
  }

  return { quotedBlocks, mainText: normalizeText(mainText) };
}

function splitSignature(text: string) {
  const lines = text.split("\n");
  let splitAt = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SIGNATURE_SEPARATORS.some((pattern) => pattern.test(line))) {
      splitAt = i;
      break;
    }
    if (CLOSING_PATTERNS.some((pattern) => pattern.test(line))) {
      splitAt = i;
      break;
    }
  }

  if (splitAt === -1) {
    return { bodyMain: text, signatureBlock: null };
  }

  const bodyMain = normalizeText(lines.slice(0, splitAt).join("\n"));
  const signatureBlock = normalizeText(lines.slice(splitAt).join("\n"));
  return { bodyMain, signatureBlock: signatureBlock || null };
}

export function parseEmailContent({
  rawHtml,
  rawText,
  bodyPreview,
}: {
  rawHtml?: string | null;
  rawText?: string | null;
  bodyPreview?: string | null;
}): ParsedEmailContent {
  const html = rawHtml || "";
  const text = rawText || "";
  const sanitizedHtml = sanitizeHtml(html);
  const plainFromHtml = normalizeText(stripTags(sanitizedHtml));
  const fallback = normalizeText(text || plainFromHtml || bodyPreview || "");

  const { quotedBlocks, mainText } = detectQuotedBlocks(sanitizedHtml, fallback);
  const { bodyMain, signatureBlock } = splitSignature(mainText);

  return {
    rawHtml: html,
    rawText: text,
    normalizedText: fallback,
    quotedBlocks,
    signatureBlock,
    bodyMain,
    sanitizedHtml,
  };
}
