const VOID_TAGS = new Set(["br", "img", "hr", "input", "meta", "link", "area", "col"]);

function collectTags(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[1]!.toLowerCase();
    if (VOID_TAGS.has(tag) && match[0].startsWith("</")) continue;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

function hasStyle(html: string): boolean {
  return /style\s*=/i.test(html);
}

export type HtmlDiff = {
  changed: boolean;
  submittedBytes: number;
  storedBytes: number;
  tagsRemoved: string[];
  stylesAltered: boolean;
  summary: string;
};

export function diffSanitizedHtml(submitted: string, stored: string): HtmlDiff {
  const submittedBytes = Buffer.byteLength(submitted, "utf8");
  const storedBytes = Buffer.byteLength(stored, "utf8");
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const changed = normalize(submitted) !== normalize(stored);

  const submittedTags = collectTags(submitted);
  const storedTags = collectTags(stored);
  const tagsRemoved: string[] = [];
  for (const [tag, count] of submittedTags) {
    const kept = storedTags.get(tag) ?? 0;
    if (kept < count) tagsRemoved.push(tag);
  }

  const stylesAltered = hasStyle(submitted) !== hasStyle(stored) || changed;

  const summary = changed
    ? `Gmail stored HTML differs from submitted (${submittedBytes} → ${storedBytes} bytes${
        tagsRemoved.length ? `; tags reduced: ${tagsRemoved.join(", ")}` : ""
      }).`
    : "Stored HTML matches submitted HTML.";

  return {
    changed,
    submittedBytes,
    storedBytes,
    tagsRemoved: [...new Set(tagsRemoved)].sort(),
    stylesAltered: changed && stylesAltered,
    summary,
  };
}
