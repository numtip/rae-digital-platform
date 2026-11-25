import { assertSharePointFileUrl } from "./documents.ts";

// M03 Document Center registry. ADR-0004: the files stay in Microsoft 365; this registry holds
// metadata and a validated link, never a copy. Pure rules here; storage is the Repository.

export const DOCUMENT_CATEGORIES = ["administration", "research", "academic-services"] as const;
export const DOCUMENT_STATUSES = ["draft", "current", "obsolete", "archived"] as const;
export const DOCUMENT_VISIBILITIES = ["public", "internal"] as const;
export const DOCUMENT_CODE = /^RAE-DC-\d{4,}$/;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type RegistryDocument = {
  code: string;
  category: string;
  titleTh: string;
  titleEn: string;
  docType: string;
  version: string;
  status: DocumentStatus;
  visibility: "public" | "internal";
  storageUrl: string;
  note: string;
  updatedAt: number;
  createdBy: string;
  downloadCount: number;
  /** ok | broken | unreachable; null until the first check. Never shown publicly. */
  linkStatus?: LinkStatus | null;
  linkCheckedAt?: number | null;
};

export type LinkStatus = "ok" | "broken" | "unreachable";

export type DocumentInput = Partial<Pick<RegistryDocument, "category" | "titleTh" | "titleEn" | "docType" | "version" | "status" | "visibility" | "storageUrl" | "note">> & {
  changeNote?: string;
};

export class DocumentInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "DocumentInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new DocumentInvalid(`${field} is required`);
  if (v.length > max) throw new DocumentInvalid(`${field} is longer than ${max} characters`);
  return v;
};

export function formatDocumentCode(n: number): string {
  return `RAE-DC-${String(n).padStart(4, "0")}`;
}

/** The file type shown to readers, taken from the link itself (the extension), never from user input. */
export function fileTypeOf(storageUrl: string): string {
  const name = assertSharePointFileUrl(storageUrl).pathname.split("/").pop() ?? "";
  return name.split(".").pop()!.toLowerCase();
}

export function validateNewDocument(input: DocumentInput) {
  const category = text(input.category, 32, "category", true);
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(category)) throw new DocumentInvalid("unknown category");
  const storageUrl = text(input.storageUrl, 1000, "storageUrl", true);
  try {
    assertSharePointFileUrl(storageUrl);
  } catch (error) {
    throw new DocumentInvalid((error as Error).message);
  }
  const visibility = (input.visibility ?? "public") as string;
  if (!(DOCUMENT_VISIBILITIES as readonly string[]).includes(visibility)) throw new DocumentInvalid("unknown visibility");
  const status = (input.status ?? "draft") as string;
  if (!(DOCUMENT_STATUSES as readonly string[]).includes(status)) throw new DocumentInvalid("unknown status");
  return {
    category,
    titleTh: text(input.titleTh, 300, "titleTh", true),
    titleEn: text(input.titleEn, 300, "titleEn", true),
    docType: fileTypeOf(storageUrl),
    version: text(input.version ?? "1.0", 16, "version", true),
    status: status as DocumentStatus,
    visibility: visibility as "public" | "internal",
    storageUrl,
    note: text(input.note, 500, "note"),
  };
}

// A new file for the same record is a new version (its own history row); nothing else is.
export function applyDocumentUpdate(current: RegistryDocument, input: DocumentInput, now: number): { next: RegistryDocument; newVersion: boolean } {
  const merged = validateNewDocument({
    category: input.category ?? current.category,
    titleTh: input.titleTh ?? current.titleTh,
    titleEn: input.titleEn ?? current.titleEn,
    version: input.version ?? current.version,
    status: input.status ?? current.status,
    visibility: input.visibility ?? current.visibility,
    storageUrl: input.storageUrl ?? current.storageUrl,
    note: input.note ?? current.note,
  });
  const newVersion = merged.storageUrl !== current.storageUrl;
  if (newVersion && merged.version === current.version) throw new DocumentInvalid("a new file needs a new version number");
  return { next: { ...current, ...merged, updatedAt: now }, newVersion };
}

/** What a reader of the public site may see: a current, public record — nothing else. */
export const isPublicDocument = (d: RegistryDocument) => d.status === "current" && d.visibility === "public";

/** The projection the public endpoint returns: no creator, no raw storage link (it is reached through the counted open route). */
export function publicDocumentView(d: RegistryDocument) {
  return {
    code: d.code,
    category: d.category,
    titleTh: d.titleTh,
    titleEn: d.titleEn,
    fileType: d.docType,
    version: d.version,
    note: d.note,
    updatedAt: new Date(d.updatedAt).toISOString(),
    downloadCount: d.downloadCount,
  };
}

/**
 * Reads a link-check answer. SharePoint answers an anonymous GET with a sign-in redirect when the file
 * exists but is not shared, so a redirect is "ok" (the host and path resolve); only a missing file is
 * "broken", and a timeout or server error is "unreachable" (try again, do not accuse the link).
 */
export function linkStatusFromResponse(status: number | null): LinkStatus {
  if (status === null) return "unreachable";
  if (status === 404 || status === 410) return "broken";
  if (status >= 500 || status === 429) return "unreachable";
  return "ok";
}

export async function checkLink(storageUrl: string, fetchImpl: typeof fetch = fetch): Promise<LinkStatus> {
  assertSharePointFileUrl(storageUrl);
  try {
    const response = await fetchImpl(storageUrl, {
      method: "GET",
      redirect: "manual",
      headers: { range: "bytes=0-0", "user-agent": "RAE-link-check/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel().catch(() => {});
    return linkStatusFromResponse(response.status);
  } catch {
    return "unreachable";
  }
}
