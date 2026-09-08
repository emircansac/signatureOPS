/** Split a stored display name into given + family for the person form. */
export function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const trimmed = displayName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

export function joinDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

const TR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

function slugPart(value: string): string {
  const folded = value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (ch) => TR_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return folded.slice(0, 40);
}

/** Storage stem: first_last_title. Empty if name/title cannot be slugged. */
export function personPhotoStem(firstName: string, lastName: string, jobTitle: string): string {
  const parts = [slugPart(firstName), slugPart(lastName), slugPart(jobTitle)].filter(Boolean);
  if (parts.length < 2) return "";
  return parts.join("_").slice(0, 80);
}

export function sanitizeFilenameStem(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export function extForImageType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function personPhotoFilename(
  firstName: string,
  lastName: string,
  jobTitle: string,
  mimeType: string,
): string {
  const stem = personPhotoStem(firstName, lastName, jobTitle);
  if (!stem) return "";
  return `${stem}.${extForImageType(mimeType)}`;
}
