// M15 Media library. Pure rules; storage is the Repository and the media volume. Images only (png, jpeg, webp,
// signature-checked — see media.ts); PDFs and other documents stay in SharePoint (ADR-0004). Only assets a publisher
// released are ever public, and a public asset is served by the runtime with the stored type, never a guessed one.
import { assertArticleImage, extensionFor, MediaRejected } from "./media.ts";

export const MEDIA_STATUSES = ["draft", "published", "archived"] as const;
export const MEDIA_CODE = /^RAE-MD-\d{4,}$/;
// Files are named by the runtime (16 random hex + extension) and live under library/<code>/. Anything else on the
// volume is not ours to serve.
export const MEDIA_FILE = /^[0-9a-f]{16}\.(png|jpg|webp)$/;

export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export type MediaAsset = {
  code: string;
  titleTh: string;
  titleEn: string;
  altTh: string;
  altEn: string;
  captionTh: string;
  captionEn: string;
  filename: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
  bytes: number;
  sha256: string;
  status: MediaStatus;
  createdBy: string;
  updatedAt: number;
};

export type MediaInput = Partial<Pick<MediaAsset, "titleTh" | "titleEn" | "altTh" | "altEn" | "captionTh" | "captionEn" | "status">>;

export class MediaInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "MediaInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new MediaInvalid(`${field} is required`);
  if (v.length > max) throw new MediaInvalid(`${field} is longer than ${max} characters`);
  return v;
};

export const formatMediaCode = (n: number) => `RAE-MD-${String(n).padStart(4, "0")}`;

export function validateMediaMeta(input: MediaInput) {
  const status = (input.status ?? "draft") as string;
  if (!(MEDIA_STATUSES as readonly string[]).includes(status)) throw new MediaInvalid("unknown status");
  const meta = {
    titleTh: text(input.titleTh, 200, "titleTh", true),
    titleEn: text(input.titleEn, 200, "titleEn", true),
    altTh: text(input.altTh, 300, "altTh"),
    altEn: text(input.altEn, 300, "altEn"),
    captionTh: text(input.captionTh, 500, "captionTh"),
    captionEn: text(input.captionEn, 500, "captionEn"),
    status: status as MediaStatus,
  };
  // A published image is read out by screen readers: both alternative texts are required before it goes live.
  if (meta.status === "published" && (!meta.altTh || !meta.altEn)) throw new MediaInvalid("altTh and altEn are required before an image is published");
  return meta;
}

/** Decode and judge an upload. The bytes decide the type; the client's file name and type are never trusted. */
export function inspectUpload(base64: unknown): { bytes: Buffer; mime: MediaAsset["mime"]; ext: string } {
  if (typeof base64 !== "string" || base64.length === 0) throw new MediaRejected("the payload is empty");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64.replace(/\s/g, ""))) throw new MediaRejected("the payload is not base64");
  const bytes = Buffer.from(base64, "base64");
  const mime = assertArticleImage(bytes.subarray(0, 16), bytes.length);
  return { bytes, mime, ext: extensionFor(mime) };
}

export function applyMediaUpdate(current: MediaAsset, input: MediaInput, now: number): MediaAsset {
  const merged = validateMediaMeta({
    titleTh: input.titleTh ?? current.titleTh,
    titleEn: input.titleEn ?? current.titleEn,
    altTh: input.altTh ?? current.altTh,
    altEn: input.altEn ?? current.altEn,
    captionTh: input.captionTh ?? current.captionTh,
    captionEn: input.captionEn ?? current.captionEn,
    status: input.status ?? current.status,
  });
  return { ...current, ...merged, updatedAt: now };
}

export const isPublicMedia = (a: MediaAsset) => a.status === "published";

/** Public projection: no author, no checksum. The URL is relative to the CMS API origin. */
export function publicMediaView(a: MediaAsset) {
  return {
    code: a.code,
    titleTh: a.titleTh,
    titleEn: a.titleEn,
    altTh: a.altTh,
    altEn: a.altEn,
    captionTh: a.captionTh,
    captionEn: a.captionEn,
    mime: a.mime,
    bytes: a.bytes,
    url: `/v1/public/media/${a.code}/${a.filename}`,
    updatedAt: new Date(a.updatedAt).toISOString(),
  };
}
