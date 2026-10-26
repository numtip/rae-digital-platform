const ALLOWED = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
] as const;

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
