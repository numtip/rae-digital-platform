// M05 Events / calendar. Pure rules; storage is the Repository. Times are stored as UTC instants;
// the desk sends ISO 8601 with an offset (Asia/Bangkok is +07:00) so nothing depends on server time zone.

export const EVENT_STATUSES = ["draft", "published", "cancelled", "archived"] as const;
export const EVENT_CODE = /^RAE-EV-\d{4,}$/;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export type EventRecord = {
  code: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  locationTh: string;
  locationEn: string;
  startsAt: number;
  endsAt: number | null;
  status: EventStatus;
  createdBy: string;
  updatedAt: number;
};

export type EventInput = Partial<Omit<EventRecord, "code" | "createdBy" | "updatedAt" | "startsAt" | "endsAt">> & {
  startsAt?: string | number | null;
  endsAt?: string | number | null;
};

export class EventInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "EventInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new EventInvalid(`${field} is required`);
  if (v.length > max) throw new EventInvalid(`${field} is longer than ${max} characters`);
  return v;
};

// A string must carry an offset (Z or +hh:mm) — a bare local time would be read in the server's zone.
function instant(value: unknown, field: string, required: boolean): number | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new EventInvalid(`${field} is required`);
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new EventInvalid(`${field} must be an ISO 8601 time with an offset, e.g. 2026-12-01T09:00:00+07:00`);
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new EventInvalid(`${field} is not a valid time`);
  return ms;
}

export const formatEventCode = (n: number) => `RAE-EV-${String(n).padStart(4, "0")}`;

export function validateEvent(input: EventInput) {
  const status = (input.status ?? "draft") as string;
  if (!(EVENT_STATUSES as readonly string[]).includes(status)) throw new EventInvalid("unknown status");
  const startsAt = instant(input.startsAt, "startsAt", true) as number;
  const endsAt = instant(input.endsAt, "endsAt", false);
  if (endsAt !== null && endsAt < startsAt) throw new EventInvalid("endsAt is before startsAt");
  return {
    titleTh: text(input.titleTh, 300, "titleTh", true),
    titleEn: text(input.titleEn, 300, "titleEn", true),
    descriptionTh: text(input.descriptionTh, 4000, "descriptionTh"),
    descriptionEn: text(input.descriptionEn, 4000, "descriptionEn"),
    locationTh: text(input.locationTh, 200, "locationTh"),
    locationEn: text(input.locationEn, 200, "locationEn"),
    startsAt,
    endsAt,
    status: status as EventStatus,
  };
}

export function applyEventUpdate(current: EventRecord, input: EventInput, now: number): EventRecord {
  const merged = validateEvent({
    titleTh: input.titleTh ?? current.titleTh,
    titleEn: input.titleEn ?? current.titleEn,
    descriptionTh: input.descriptionTh ?? current.descriptionTh,
    descriptionEn: input.descriptionEn ?? current.descriptionEn,
    locationTh: input.locationTh ?? current.locationTh,
    locationEn: input.locationEn ?? current.locationEn,
    startsAt: input.startsAt === undefined ? current.startsAt : input.startsAt,
    endsAt: input.endsAt === undefined ? current.endsAt : input.endsAt,
    status: input.status ?? current.status,
  });
  return { ...current, ...merged, updatedAt: now };
}

/** Readers see published events and cancelled ones (so a cancellation is announced, not silently dropped). */
export const isPublicEvent = (e: EventRecord) => e.status === "published" || e.status === "cancelled";

export function publicEventView(e: EventRecord) {
  return {
    code: e.code,
    titleTh: e.titleTh,
    titleEn: e.titleEn,
    descriptionTh: e.descriptionTh,
    descriptionEn: e.descriptionEn,
    locationTh: e.locationTh,
    locationEn: e.locationEn,
    startsAt: new Date(e.startsAt).toISOString(),
    endsAt: e.endsAt === null ? null : new Date(e.endsAt).toISOString(),
    cancelled: e.status === "cancelled",
    updatedAt: new Date(e.updatedAt).toISOString(),
  };
}

export const byStart = <T extends { startsAt: number; code: string }>(a: T, b: T) => a.startsAt - b.startsAt || a.code.localeCompare(b.code);
