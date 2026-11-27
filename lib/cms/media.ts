const ALLOWED = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
] as const;

// Ids become directory names under the media root, so they are validated rather than trusted.
export const SAFE_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
// Uploads are named by the runtime (`01-1a2b3c4d.jpg`); anything else is not ours to read.
export const SAFE_MEDIA_FILE = /^\d{2}-[0-9a-f]{8}\.(png|jpg|webp)$/;

export class MediaRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaRejected";
  }
}

export function detectAllowedMedia(header: Uint8Array): (typeof ALLOWED)[number]["mime"] {
  if (header[0] === 0x4d && header[1] === 0x5a) throw new MediaRejected("executable content is rejected");
  const match = ALLOWED.find((kind) => kind.bytes.every((byte, index) => header[index] === byte));
  if (!match) throw new MediaRejected("file type is not on the allow-list");
  if (match.mime === "image/webp") {
    const mark = String.fromCharCode(...header.slice(8, 12));
    if (mark !== "WEBP") throw new MediaRejected("webp signature is incomplete");
  }
  return match.mime;
}

// Article images: a narrower allow-list than the document registry, because a news gallery is
// rendered to a browser and never meant to carry a PDF or an archive.
export const MAX_ARTICLE_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ArticleImageMime = (typeof IMAGE_MIMES)[number];

const EXTENSION: Record<ArticleImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function assertArticleImage(header: Uint8Array, size: number): ArticleImageMime {
  if (size <= 0) throw new MediaRejected("the file is empty");
  if (size > MAX_ARTICLE_IMAGE_BYTES) throw new MediaRejected("the image is larger than 8 MB");
  const mime = detectAllowedMedia(header);
  if (!(IMAGE_MIMES as readonly string[]).includes(mime)) {
    throw new MediaRejected("a news gallery accepts png, jpeg or webp only");
  }
  return mime as ArticleImageMime;
}

export function extensionFor(mime: ArticleImageMime): string {
  return EXTENSION[mime];
}
