// M07 Contact form. Pure rules. The form is OFF until the owner supplies an approved privacy notice
// (version + Thai + English text), a retention period and enables it — none of that is invented here.

export const CONTACT_STATUSES = ["new", "read", "replied", "archived"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type ContactNotice = { version: string; th: string; en: string };
export type ContactConfig = { enabled: false } | { enabled: true; notice: ContactNotice; retentionDays: number; allowedOrigins: string[] };

export type ContactMessage = {
  code: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: "th" | "en";
  noticeVersion: string;
  consentedAt: number;
  status: ContactStatus;
  createdAt: number;
};

export class ContactInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ContactInvalid";
  }
}

export const formatContactCode = (n: number) => `RAE-CT-${String(n).padStart(5, "0")}`;
export const CONTACT_CODE = /^RAE-CT-\d{5,}$/;

/**
 * Reads the owner-supplied configuration. Anything missing or malformed leaves the form off:
 * CONTACT_FORM_ENABLED=true, CONTACT_RETENTION_DAYS (1..3650), CONTACT_NOTICE_JSON = path of a JSON file
 * {"version","th","en"}; CONTACT_ALLOWED_ORIGINS = comma-separated https origins that may post.
 */
export function readContactConfig(env: Record<string, string | undefined>, readFile: (path: string) => string): ContactConfig {
  if (env.CONTACT_FORM_ENABLED !== "true") return { enabled: false };
  const days = Number(env.CONTACT_RETENTION_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return { enabled: false };
  try {
    const raw = JSON.parse(readFile(String(env.CONTACT_NOTICE_JSON))) as Partial<ContactNotice>;
    const ok = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
    if (!ok(raw.version, 32) || !ok(raw.th, 4000) || !ok(raw.en, 4000)) return { enabled: false };
    const allowedOrigins = (env.CONTACT_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter((o) => /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o));
    return { enabled: true, notice: { version: raw.version!.trim(), th: raw.th!, en: raw.en! }, retentionDays: days, allowedOrigins };
  } catch {
    return { enabled: false };
  }
}

const text = (value: unknown, max: number, field: string, required = true) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new ContactInvalid(`${field} is required`);
  if (v.length > max) throw new ContactInvalid(`${field} is longer than ${max} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new ContactInvalid(`${field} has control characters`);
  return v;
};

const EMAIL = /^[^\s@<>"',;:()\[\]\\]+@[^\s@<>"',;:()\[\]\\]+\.[^\s@<>"',;:()\[\]\\]{2,}$/;

export function validateContact(input: Record<string, unknown>, notice: ContactNotice) {
  if (input.consent !== true) throw new ContactInvalid("consent is required");
  if (input.noticeVersion !== notice.version) throw new ContactInvalid("the privacy notice has changed; reload the page");
  const email = text(input.email, 254, "email");
  if (!EMAIL.test(email)) throw new ContactInvalid("email is not valid");
  const locale = input.locale === "en" ? "en" : "th";
  return {
    name: text(input.name, 120, "name"),
    email,
    subject: text(input.subject, 200, "subject"),
    message: text(input.message, 4000, "message"),
    locale: locale as "th" | "en",
  };
}
