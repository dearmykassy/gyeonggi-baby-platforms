export type RenderedAuthoredScope =
  | "shared-service"
  | "local-substantive"
  | "directory";

export type AuthoredParagraphEntry = {
  sectionId: string;
  paragraph: string;
};

export type RenderedAuthoredSection = {
  sectionId: string;
  auditScope: string;
  factRefs: readonly string[];
  paragraphs: readonly string[];
};

export type RenderedAuthoredScopeParseResult = {
  sections: readonly RenderedAuthoredSection[];
  failures: readonly string[];
};

type AuthoredSectionLike = {
  id?: unknown;
  auditScope?: unknown;
  paragraphs?: readonly unknown[];
};

const VALID_SCOPES = new Set<RenderedAuthoredScope>([
  "shared-service",
  "local-substantive",
  "directory",
]);

const PRECISE_ADDRESS_EXPOSURE_PATTERN =
  /(?:도로|길)\s+\d+(?:\s*-\s*\d+)?\b|\d+\s*-\s*\d+|우편번호|건물관리번호/u;

function cleanText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([a-f0-9]+);/giu, (_, hexadecimal: string) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16)),
    )
    .replace(/&#([0-9]+);/gu, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&quot;/giu, '"')
    .replace(/&apos;/giu, "'")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

function stripHtml(value: string): string {
  return cleanText(
    decodeHtmlEntities(
      value
        .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
        .replace(/<[^>]+>/gu, " "),
    ),
  );
}

function htmlAttributes(value: string): Readonly<Record<string, string>> {
  const entries = [...value.matchAll(/([:\w-]+)="([^"]*)"/gu)].map(
    (match) => [match[1], decodeHtmlEntities(match[2] ?? "")] as const,
  );
  return Object.fromEntries(entries);
}

function parseFactRefs(value: string | undefined): readonly string[] | null {
  if (value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.some((reference) => typeof reference !== "string")
    ) {
      return null;
    }
    return parsed.map(cleanText).filter(Boolean);
  } catch {
    return null;
  }
}

export function extractRenderedAuthoredSections(
  html: string,
): RenderedAuthoredScopeParseResult {
  const sections: RenderedAuthoredSection[] = [];
  const failures: string[] = [];
  const source = String(html ?? "");
  const sectionTags = [...source.matchAll(/<(\/?)section\b([^>]*)>/giu)];
  const stack: Array<{
    attributes: Readonly<Record<string, string>>;
    bodyStart: number;
  }> = [];
  const tracedBlocks: Array<{
    attributes: Readonly<Record<string, string>>;
    body: string;
    bodyStart: number;
  }> = [];

  for (const tag of sectionTags) {
    if (tag[1] !== "/") {
      stack.push({
        attributes: htmlAttributes(tag[2] ?? ""),
        bodyStart: (tag.index ?? 0) + tag[0].length,
      });
      continue;
    }
    const opening = stack.pop();
    if (!opening) {
      failures.push("UNBALANCED_SECTION_CLOSE");
      continue;
    }
    tracedBlocks.push({
      attributes: opening.attributes,
      body: source.slice(opening.bodyStart, tag.index ?? source.length),
      bodyStart: opening.bodyStart,
    });
  }
  if (stack.length > 0) failures.push("UNBALANCED_SECTION_OPEN");

  for (const block of tracedBlocks.toSorted(
    (left, right) => left.bodyStart - right.bodyStart,
  )) {
    const attributes = block.attributes;
    const traceKeys = [
      "data-authored-section-id",
      "data-authored-audit-scope",
      "data-authored-fact-refs",
    ];
    if (!traceKeys.some((key) => Object.hasOwn(attributes, key))) continue;

    const sectionId = cleanText(attributes["data-authored-section-id"]);
    const auditScope = cleanText(attributes["data-authored-audit-scope"]);
    const factRefs = parseFactRefs(attributes["data-authored-fact-refs"]);
    const evidenceId = sectionId || "<missing>";

    if (!sectionId) failures.push(`MISSING_SECTION_ID:${evidenceId}`);
    if (!VALID_SCOPES.has(auditScope as RenderedAuthoredScope)) {
      failures.push(`INVALID_AUDIT_SCOPE:${evidenceId}:${auditScope || "<missing>"}`);
    }
    if (factRefs === null) failures.push(`INVALID_FACT_REFS:${evidenceId}`);

    const indexedParagraphs = [...block.body.matchAll(
      /<p\b([^>]*)>([\s\S]*?)<\/p>/giu,
    )]
      .map((paragraphMatch) => {
        const paragraphAttributes = htmlAttributes(paragraphMatch[1] ?? "");
        const rawIndex = paragraphAttributes["data-authored-paragraph-index"];
        if (rawIndex === undefined) return null;
        if (!/^\d+$/u.test(rawIndex)) {
          failures.push(`INVALID_PARAGRAPH_INDEX:${evidenceId}:${rawIndex}`);
          return null;
        }
        return {
          index: Number(rawIndex),
          paragraph: stripHtml(paragraphMatch[2] ?? ""),
        };
      })
      .filter(
        (entry): entry is { index: number; paragraph: string } => entry !== null,
      )
      .sort((left, right) => left.index - right.index);
    if (
      new Set(indexedParagraphs.map((entry) => entry.index)).size !==
      indexedParagraphs.length
    ) {
      failures.push(`DUPLICATE_PARAGRAPH_INDEX:${evidenceId}`);
    }
    if (
      indexedParagraphs.some((entry, index) => entry.index !== index)
    ) {
      failures.push(`NON_CONTIGUOUS_PARAGRAPH_INDEX:${evidenceId}`);
    }
    if (indexedParagraphs.some((entry) => !entry.paragraph)) {
      failures.push(`EMPTY_AUTHORED_PARAGRAPH:${evidenceId}`);
    }

    sections.push({
      sectionId,
      auditScope,
      factRefs: factRefs ?? [],
      paragraphs: indexedParagraphs.map((entry) => entry.paragraph),
    });
  }

  const sectionIds = sections.map((section) => section.sectionId);
  if (new Set(sectionIds).size !== sectionIds.length) {
    failures.push("DUPLICATE_RENDERED_SECTION_ID");
  }

  return {
    sections,
    failures: [...new Set(failures)].sort(),
  };
}

export function canonicalAuthoredLocalParagraphEntries(
  sections: readonly AuthoredSectionLike[],
): readonly AuthoredParagraphEntry[] {
  return sections
    .filter((section) => section.auditScope === "local-substantive")
    .flatMap((section) => {
      const sectionId = cleanText(section.id);
      return (section.paragraphs ?? []).map((paragraph) => ({
        sectionId,
        paragraph: cleanText(paragraph),
      }));
    })
    .filter((entry) => entry.sectionId && entry.paragraph)
    .toSorted(
      (left, right) =>
        left.sectionId.localeCompare(right.sectionId, "en") ||
        left.paragraph.localeCompare(right.paragraph, "ko"),
    );
}

export function hasPreciseAddressExposure(
  paragraphs: readonly string[],
): boolean {
  return paragraphs.some((paragraph) =>
    PRECISE_ADDRESS_EXPOSURE_PATTERN.test(cleanText(paragraph)),
  );
}
