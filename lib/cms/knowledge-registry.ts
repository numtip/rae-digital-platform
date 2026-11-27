// M04 Knowledge / FAQ entries. Pure rules; storage is the Repository. Only entries an editor wrote
// and a publisher released are ever public — the site ships no FAQ text of its own.

export const KNOWLEDGE_STATUSES = ["draft", "published", "archived"] as const;
export const KNOWLEDGE_CODE = /^RAE-KB-\d{4,}$/;

export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export type KnowledgeEntry = {
  code: string;
  kind: "faq";
  topic: string;
  questionTh: string;
  questionEn: string;
  answerTh: string;
  answerEn: string;
  status: KnowledgeStatus;
  sortOrder: number;
  createdBy: string;
  updatedAt: number;
};

export type KnowledgeInput = Partial<Pick<KnowledgeEntry, "topic" | "questionTh" | "questionEn" | "answerTh" | "answerEn" | "status" | "sortOrder">>;

export class KnowledgeInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeInvalid";
  }
}

const text = (value: unknown, max: number, field: string, required = false) => {
  const v = typeof value === "string" ? value.trim() : "";
  if (required && !v) throw new KnowledgeInvalid(`${field} is required`);
  if (v.length > max) throw new KnowledgeInvalid(`${field} is longer than ${max} characters`);
  return v;
};

export const formatKnowledgeCode = (n: number) => `RAE-KB-${String(n).padStart(4, "0")}`;

export function validateKnowledge(input: KnowledgeInput) {
  const status = (input.status ?? "draft") as string;
  if (!(KNOWLEDGE_STATUSES as readonly string[]).includes(status)) throw new KnowledgeInvalid("unknown status");
  const order = input.sortOrder === undefined ? 100 : Number(input.sortOrder);
  if (!Number.isInteger(order) || order < 0 || order > 100000) throw new KnowledgeInvalid("sortOrder must be a whole number 0–100000");
  return {
    kind: "faq" as const,
    topic: text(input.topic, 80, "topic"),
    questionTh: text(input.questionTh, 300, "questionTh", true),
    questionEn: text(input.questionEn, 300, "questionEn", true),
    answerTh: text(input.answerTh, 4000, "answerTh", true),
    answerEn: text(input.answerEn, 4000, "answerEn", true),
    status: status as KnowledgeStatus,
    sortOrder: order,
  };
}

export function applyKnowledgeUpdate(current: KnowledgeEntry, input: KnowledgeInput, now: number): KnowledgeEntry {
  const merged = validateKnowledge({
    topic: input.topic ?? current.topic,
    questionTh: input.questionTh ?? current.questionTh,
    questionEn: input.questionEn ?? current.questionEn,
    answerTh: input.answerTh ?? current.answerTh,
    answerEn: input.answerEn ?? current.answerEn,
    status: input.status ?? current.status,
    sortOrder: input.sortOrder ?? current.sortOrder,
  });
  return { ...current, ...merged, updatedAt: now };
}

export const isPublicKnowledge = (e: KnowledgeEntry) => e.status === "published";

/** Public projection: no author. */
export function publicKnowledgeView(e: KnowledgeEntry) {
  return {
    code: e.code,
    topic: e.topic,
    questionTh: e.questionTh,
    questionEn: e.questionEn,
    answerTh: e.answerTh,
    answerEn: e.answerEn,
    sortOrder: e.sortOrder,
    updatedAt: new Date(e.updatedAt).toISOString(),
  };
}

/** Ordering shared by the desk and the public page. */
export const bySortOrder = <T extends { sortOrder: number; code: string }>(a: T, b: T) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code);
