import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// M12 Personnel. Pure rules + the encryption of the restricted blob. Nothing here is seeded: records come from the
// officers who enter verified data. The restricted fields never appear in any public projection, list or log.

export const PERSONNEL_CODE = /^RAE-PS-\d{4,}$/;
export const PERSONNEL_STATUSES = ["active", "inactive"] as const;
export const GENDERS = ["male", "female", "other", "unspecified"] as const;

export type Personnel = {
  code: string;
  employeeCode: string | null;
  prefixTh: string;
  firstTh: string;
  lastTh: string;
  firstEn: string;
  lastEn: string;
  positionTh: string;
  positionEn: string;
  academicRank: string;
  level: string;
  workGroup: string;
  departmentCode: string | null;
  email: string;
  phoneOffice: string;
  expertise: string[];
  isPublic: boolean;
  consentAt: number | null;
  consentBy: string | null;
  status: (typeof PERSONNEL_STATUSES)[number];
  source: "manual";
  createdBy: string;
  updatedAt: number;
};

export class PersonnelInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "PersonnelInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new PersonnelInvalid(`${field} is required`);
  if (v.length > max) throw new PersonnelInvalid(`${field} is longer than ${max} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new PersonnelInvalid(`${field} has control characters`);
  return v;
};

export const formatPersonnelCode = (n: number) => `RAE-PS-${String(n).padStart(4, "0")}`;

const EMAIL = /^[^\s@<>"',;:()\[\]\\]+@[^\s@<>"',;:()\[\]\\]+\.[^\s@<>"',;:()\[\]\\]{2,}$/;
const PHONE = /^[0-9+\-() ,.#xext]{3,40}$/i;

export type PersonnelInput = Partial<Omit<Personnel, "code" | "createdBy" | "updatedAt" | "consentAt" | "consentBy" | "source">> & { consent?: boolean };

export function validatePersonnel(input: PersonnelInput) {
  const status = (input.status ?? "active") as string;
  if (!(PERSONNEL_STATUSES as readonly string[]).includes(status)) throw new PersonnelInvalid("unknown status");
  const email = text(input.email, 254, "email");
  if (email && !EMAIL.test(email)) throw new PersonnelInvalid("email is not valid");
  const phoneOffice = text(input.phoneOffice, 40, "phoneOffice");
  if (phoneOffice && !PHONE.test(phoneOffice)) throw new PersonnelInvalid("phoneOffice is not a phone number");
  const departmentCode = input.departmentCode === undefined || input.departmentCode === "" ? null : (input.departmentCode as string | null);
  if (departmentCode !== null && !/^RAE-DP-\d{4,}$/.test(departmentCode)) throw new PersonnelInvalid("departmentCode is not a department code");
  const employeeCode = text(input.employeeCode, 32, "employeeCode") || null;
  const expertise = Array.isArray(input.expertise) ? input.expertise : [];
  if (expertise.length > 10) throw new PersonnelInvalid("at most 10 expertise entries");
  return {
    employeeCode,
    prefixTh: text(input.prefixTh, 40, "prefixTh"),
    firstTh: text(input.firstTh, 120, "firstTh", true),
    lastTh: text(input.lastTh, 120, "lastTh", true),
    firstEn: text(input.firstEn, 120, "firstEn"),
    lastEn: text(input.lastEn, 120, "lastEn"),
    positionTh: text(input.positionTh, 200, "positionTh", true),
    positionEn: text(input.positionEn, 200, "positionEn"),
    academicRank: text(input.academicRank, 80, "academicRank"),
    level: text(input.level, 80, "level"),
    workGroup: text(input.workGroup, 120, "workGroup"),
    departmentCode,
    email,
    phoneOffice,
    expertise: expertise.map((e, i) => text(e, 60, `expertise[${i}]`, true)),
    isPublic: input.isPublic === true,
    status: status as Personnel["status"],
  };
}

export function applyPersonnelUpdate(current: Personnel, input: PersonnelInput, now: number, actor: string): Personnel {
  const merged = validatePersonnel({
    employeeCode: input.employeeCode === undefined ? current.employeeCode : input.employeeCode,
    prefixTh: input.prefixTh ?? current.prefixTh,
    firstTh: input.firstTh ?? current.firstTh,
    lastTh: input.lastTh ?? current.lastTh,
    firstEn: input.firstEn ?? current.firstEn,
    lastEn: input.lastEn ?? current.lastEn,
    positionTh: input.positionTh ?? current.positionTh,
    positionEn: input.positionEn ?? current.positionEn,
    academicRank: input.academicRank ?? current.academicRank,
    level: input.level ?? current.level,
    workGroup: input.workGroup ?? current.workGroup,
    departmentCode: input.departmentCode === undefined ? current.departmentCode : input.departmentCode,
    email: input.email ?? current.email,
    phoneOffice: input.phoneOffice ?? current.phoneOffice,
    expertise: input.expertise ?? current.expertise,
    isPublic: input.isPublic === undefined ? current.isPublic : input.isPublic,
    status: input.status ?? current.status,
  });
  // Going public needs a recorded consent: an explicit `consent: true` from the officer who obtained it.
  let { consentAt, consentBy } = current;
  if (merged.isPublic && !current.consentAt) {
    if (input.consent !== true) throw new PersonnelInvalid("publishing a person needs consent: true (the person's consent has been obtained)");
    consentAt = now;
    consentBy = actor;
  }
  if (merged.status === "inactive") merged.isPublic = false; // an inactive person is never public
  return { ...current, ...merged, consentAt, consentBy, updatedAt: now };
}

/** Public directory projection: no employee code, no source, no consent/author data. */
export const isPublicPerson = (p: Personnel) => p.status === "active" && p.isPublic && p.consentAt !== null;
export function publicPersonView(p: Personnel) {
  return {
    code: p.code,
    prefixTh: p.prefixTh,
    firstTh: p.firstTh,
    lastTh: p.lastTh,
    firstEn: p.firstEn,
    lastEn: p.lastEn,
    positionTh: p.positionTh,
    positionEn: p.positionEn,
    academicRank: p.academicRank,
    workGroup: p.workGroup,
    departmentCode: p.departmentCode,
    email: p.email,
    phoneOffice: p.phoneOffice,
    expertise: p.expertise,
  };
}

// ---- restricted data ------------------------------------------------------------------------------------------

export type PrivateData = {
  nationalId?: string;
  birthDate?: string;
  gender?: (typeof GENDERS)[number];
  address?: string;
  lineId?: string;
  facebookUrl?: string;
  personalPhone?: string;
  education?: { level: string; degree: string; major: string; institution: string; year: string }[];
  workHistory?: { organization: string; position: string; startYear: string; endYear: string }[];
  training?: { title: string; provider: string; year: string; hours: string }[];
};

/** Thai national id: 13 digits, the last is a mod-11 check digit over the first 12. */
export function validNationalId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

const list = <T>(value: unknown, field: string, shape: (row: Record<string, unknown>, at: string) => T): T[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30) throw new PersonnelInvalid(`${field} must be a list of at most 30 rows`);
  return value.map((row, i) => shape((row ?? {}) as Record<string, unknown>, `${field}[${i}]`));
};

export function validatePrivate(input: Record<string, unknown>): PrivateData {
  const out: PrivateData = {};
  if (input.nationalId !== undefined && input.nationalId !== "") {
    const id = String(input.nationalId).replace(/[\s-]/g, "");
    if (!validNationalId(id)) throw new PersonnelInvalid("nationalId is not a valid 13-digit Thai national id");
    out.nationalId = id;
  }
  if (input.birthDate) {
    const v = text(input.birthDate, 10, "birthDate");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || v < "1900-01-01" || v > new Date().toISOString().slice(0, 10)) throw new PersonnelInvalid("birthDate must be a past date, YYYY-MM-DD");
    out.birthDate = v;
  }
  if (input.gender) {
    if (!(GENDERS as readonly string[]).includes(String(input.gender))) throw new PersonnelInvalid("unknown gender");
    out.gender = input.gender as (typeof GENDERS)[number];
  }
  if (input.address) out.address = text(input.address, 500, "address");
  if (input.lineId) out.lineId = text(input.lineId, 64, "lineId");
  if (input.facebookUrl) {
    const v = text(input.facebookUrl, 300, "facebookUrl");
    try {
      if (new URL(v).protocol !== "https:") throw new Error("scheme");
    } catch {
      throw new PersonnelInvalid("facebookUrl must be an https URL");
    }
    out.facebookUrl = v;
  }
  if (input.personalPhone) {
    const v = text(input.personalPhone, 40, "personalPhone");
    if (!PHONE.test(v)) throw new PersonnelInvalid("personalPhone is not a phone number");
    out.personalPhone = v;
  }
  out.education = list(input.education, "education", (r, at) => ({ level: text(r.level, 60, `${at}.level`), degree: text(r.degree, 120, `${at}.degree`), major: text(r.major, 120, `${at}.major`), institution: text(r.institution, 160, `${at}.institution`), year: text(r.year, 4, `${at}.year`) }));
  out.workHistory = list(input.workHistory, "workHistory", (r, at) => ({ organization: text(r.organization, 160, `${at}.organization`, true), position: text(r.position, 160, `${at}.position`), startYear: text(r.startYear, 4, `${at}.startYear`), endYear: text(r.endYear, 4, `${at}.endYear`) }));
  out.training = list(input.training, "training", (r, at) => ({ title: text(r.title, 200, `${at}.title`, true), provider: text(r.provider, 160, `${at}.provider`), year: text(r.year, 4, `${at}.year`), hours: text(r.hours, 6, `${at}.hours`) }));
  return out;
}

export type PersonnelCrypto = { encrypt(code: string, data: PrivateData): string; decrypt(code: string, blob: string): PrivateData; nationalIdHash(id: string): string };

/** AES-256-GCM with the person's code as additional authenticated data (a blob cannot be moved to another person). */
export function createPersonnelCrypto(keyBase64: string | undefined): PersonnelCrypto | null {
  if (!keyBase64) return null;
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) return null;
  return {
    encrypt(code, data) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(code));
      const body = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
      return `v1:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
    },
    decrypt(code, blob) {
      if (!blob.startsWith("v1:")) throw new Error("unknown ciphertext version");
      const raw = Buffer.from(blob.slice(3), "base64");
      const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
      decipher.setAAD(Buffer.from(code));
      decipher.setAuthTag(raw.subarray(12, 28));
      return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")) as PrivateData;
    },
    nationalIdHash: (id) => createHmac("sha256", key).update(`national-id:${id}`).digest("hex"),
  };
}

export const maskNationalId = (id: string) => `${id[0]}-XXXX-XXXXX-XX-${id[12]}`;
export const byName = <T extends { firstTh: string; lastTh: string; code: string }>(a: T, b: T) => a.lastTh.localeCompare(b.lastTh, "th") || a.firstTh.localeCompare(b.firstTh, "th") || a.code.localeCompare(b.code);
