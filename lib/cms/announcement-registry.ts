// M17 Announcements: banner (a strip at the top), popup (a dialog, once per session) and ticker (a scrolling line).
// Pure rules. Schedule and expiry are decided here, on the server, per request — the site never decides who is live.

export const ANNOUNCEMENT_KINDS = ["banner", "popup", "ticker"] as const;
export const ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"] as const;
export const ANNOUNCEMENT_CODE = /^RAE-AN-\d{4,}$/;

export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export type Announcement = {
  code: string;
  kind: AnnouncementKind;
  titleTh: string;
  titleEn: string;
  bodyTh: string;
  bodyEn: string;
  linkUrl: string;
  startsAt: number;
  endsAt: number;
  status: AnnouncementStatus;
  createdBy: string;
  updatedAt: number;
};

export type AnnouncementInput = Partial<Omit<Announcement, "code" | "createdBy" | "updatedAt" | "startsAt" | "endsAt">> & {
  startsAt?: string | number | null;
  endsAt?: string | number | null;
};

export class AnnouncementInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "AnnouncementInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new AnnouncementInvalid(`${field} is required`);
  if (v.length > max) throw new AnnouncementInvalid(`${field} is longer than ${max} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new AnnouncementInvalid(`${field} has control characters`);
  return v;
};

function instant(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new AnnouncementInvalid(`${field} must be an ISO 8601 time with an offset, e.g. 2026-12-01T09:00:00+07:00`);
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new AnnouncementInvalid(`${field} is not a valid time`);
  return ms;
}

/** A link is a path on this site ("/th/...") or an https URL — never javascript:, data:, protocol-relative or http. */
export function validateLink(value: unknown): string {
  const v = text(value, 500, "linkUrl");
  if (!v) return "";
  if (/^\/(th|en)(\/|$)/.test(v) && !v.includes("//") && !/[\s\\]/.test(v)) return v;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" && !u.username && !u.password) return u.toString();
  } catch {
    /* fall through */
  }
  throw new AnnouncementInvalid("linkUrl must be a /th/… or /en/… path or an https URL");
}

export const formatAnnouncementCode = (n: number) => `RAE-AN-${String(n).padStart(4, "0")}`;

export function validateAnnouncement(input: AnnouncementInput) {
  const kind = input.kind as string;
  if (!(ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) throw new AnnouncementInvalid("kind must be banner, popup or ticker");
  const status = (input.status ?? "draft") as string;
  if (!(ANNOUNCEMENT_STATUSES as readonly string[]).includes(status)) throw new AnnouncementInvalid("unknown status");
  const startsAt = instant(input.startsAt, "startsAt");
  const endsAt = instant(input.endsAt, "endsAt");
  if (endsAt <= startsAt) throw new AnnouncementInvalid("endsAt must be after startsAt (every announcement expires)");
  return {
    kind: kind as AnnouncementKind,
    titleTh: text(input.titleTh, 200, "titleTh", true),
    titleEn: text(input.titleEn, 200, "titleEn", true),
    bodyTh: text(input.bodyTh, 600, "bodyTh", kind === "popup"),
    bodyEn: text(input.bodyEn, 600, "bodyEn", kind === "popup"),
    linkUrl: validateLink(input.linkUrl),
    startsAt,
    endsAt,
    status: status as AnnouncementStatus,
  };
}

export function applyAnnouncementUpdate(current: Announcement, input: AnnouncementInput, now: number): Announcement {
  const merged = validateAnnouncement({
    kind: input.kind ?? current.kind,
    titleTh: input.titleTh ?? current.titleTh,
    titleEn: input.titleEn ?? current.titleEn,
    bodyTh: input.bodyTh ?? current.bodyTh,
    bodyEn: input.bodyEn ?? current.bodyEn,
    linkUrl: input.linkUrl ?? current.linkUrl,
    startsAt: input.startsAt === undefined ? current.startsAt : input.startsAt,
    endsAt: input.endsAt === undefined ? current.endsAt : input.endsAt,
    status: input.status ?? current.status,
  });
  return { ...current, ...merged, updatedAt: now };
}

/** Live right now: published and inside its window. Evaluated on the server for every public request. */
export const isLiveAnnouncement = (a: Announcement, now: number) => a.status === "published" && a.startsAt <= now && now < a.endsAt;

export function publicAnnouncementView(a: Announcement) {
  return {
    code: a.code,
    kind: a.kind,
    titleTh: a.titleTh,
    titleEn: a.titleEn,
    bodyTh: a.bodyTh,
    bodyEn: a.bodyEn,
    linkUrl: a.linkUrl,
    endsAt: new Date(a.endsAt).toISOString(),
  };
}

export const byStartDesc = <T extends { startsAt: number; code: string }>(a: T, b: T) => b.startsAt - a.startsAt || b.code.localeCompare(a.code);
