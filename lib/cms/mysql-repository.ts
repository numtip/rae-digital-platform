import { randomUUID } from "node:crypto";
import { formatDocumentCode, type RegistryDocument } from "./document-registry.ts";
import { formatAnnouncementCode, type Announcement } from "./announcement-registry.ts";
import { formatContactCode, type ContactMessage, type ContactStatus } from "./contact-registry.ts";
import { formatEventCode, type EventRecord } from "./event-registry.ts";
import { formatKnowledgeCode, type KnowledgeEntry } from "./knowledge-registry.ts";
import mysql from "mysql2/promise";
import type { NewsRecord, PublishedSnapshot } from "./news-workflow.ts";
import type { RoleName } from "./permissions.ts";
import type { Session } from "./session.ts";

// Persistence for the CMS runtime. The runtime owns the rules; this file only moves records.
// Two implementations behind one shape: MySQL (the isolated rae_cms database) and the
// in-memory maps the runtime has always used, so the desk still runs without a database.

export type CmsUser = { id: string; role: RoleName; passwordHash: string };

export type MediaRecord = {
  id: string;
  articleId: string;
  position: number;
  filename: string;
  mime: string;
  bytes: number;
  captionTh: string;
  captionEn: string;
  altTh: string;
  altEn: string;
};

export type AuditRecord = {
  actorId: string;
  action: string;
  entityId: string;
  entityType: string;
  /** The state before and after the transition, as JSON-able objects. */
  before?: unknown;
  after?: unknown;
  createdAt: string;
};

export type SsoLink = {
  id: string;
  subjectKey: string;
  status: "pending" | "approved" | "revoked";
  userId: string | null;
  requestedAt: number;
  approvedBy: string | null;
  approvedAt: number | null;
};

export type DocumentVersionRecord = { version: string; storageUrl: string; changedBy: string; changedAt: number; changeNote: string };

export type Repository = {
  /** M18: the newest audit rows (read only; before/after payloads are not returned). */
  recentAudit(limit: number): Promise<{ actorId: string; action: string; entityType: string; entityId: string; createdAt: string }[]>;
  /** M17 announcements. Code assignment is the repository's job. */
  createAnnouncement(a: Omit<Announcement, "code">, audit: Omit<AuditRecord, "createdAt" | "entityId">): Promise<Announcement>;
  listAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(code: string): Promise<Announcement | null>;
  updateAnnouncement(a: Announcement, audit: Omit<AuditRecord, "createdAt">): Promise<void>;
  /** M08 analytics: +1 for (day, path); paths beyond the per-day cap are folded into "/other". */
  recordPageView(day: string, path: string, maxPaths: number): Promise<void>;
  listPageViews(sinceDay: string): Promise<{ day: string; path: string; hits: number }[]>;
  /** M07 contact inbox. */
  createContactMessage(m: Omit<ContactMessage, "code">, audit: Omit<AuditRecord, "createdAt" | "entityId">): Promise<ContactMessage>;
  listContactMessages(): Promise<ContactMessage[]>;
  setContactStatus(code: string, status: ContactStatus, audit: Omit<AuditRecord, "createdAt">): Promise<boolean>;
  /** Deletes messages created before the cutoff (retention); returns how many. */
  purgeContactMessages(cutoff: number): Promise<number>;
  /** M05 events. Code assignment is the repository's job. */
  createEvent(event: Omit<EventRecord, "code">, audit: Omit<AuditRecord, "createdAt" | "entityId">): Promise<EventRecord>;
  listEvents(): Promise<EventRecord[]>;
  getEvent(code: string): Promise<EventRecord | null>;
  updateEvent(event: EventRecord, audit: Omit<AuditRecord, "createdAt">): Promise<void>;
  /** M04 knowledge / FAQ entries. Code assignment is the repository's job. */
  createKnowledge(entry: Omit<KnowledgeEntry, "code">, audit: Omit<AuditRecord, "createdAt" | "entityId">): Promise<KnowledgeEntry>;
  listKnowledge(): Promise<KnowledgeEntry[]>;
  getKnowledge(code: string): Promise<KnowledgeEntry | null>;
  updateKnowledge(entry: KnowledgeEntry, audit: Omit<AuditRecord, "createdAt">): Promise<void>;
  /** M03 registry. Code assignment is the repository's job so two creators can never share a code. */
  createDocument(doc: Omit<RegistryDocument, "code" | "downloadCount">, audit: Omit<AuditRecord, "createdAt" | "entityId">): Promise<RegistryDocument>;
  listDocuments(): Promise<RegistryDocument[]>;
  getDocument(code: string): Promise<RegistryDocument | null>;
  updateDocument(doc: RegistryDocument, version: DocumentVersionRecord | null, audit: Omit<AuditRecord, "createdAt">): Promise<void>;
  listDocumentVersions(code: string): Promise<DocumentVersionRecord[]>;
  setLinkHealth(code: string, status: "ok" | "broken" | "unreachable", checkedAt: number): Promise<void>;
  /** Atomic +1; returns the record (with its storage link) or null if it is not a counted, public, current document. */
  countDownload(code: string): Promise<RegistryDocument | null>;
  /** MJU SSO. Absent on repositories that predate migration 008; the runtime then keeps SSO off. */
  findSsoLink(subjectKey: string): Promise<SsoLink | null>;
  /** Records a first sign-in attempt as `pending`. Never approves; a no-op if a row exists. */
  requestSsoLink(subjectKey: string, now: number): Promise<SsoLink>;
  listSsoLinks(): Promise<SsoLink[]>;
  /** Pending -> approved for one existing user. False if the row was not pending or the user already has a link. */
  approveSsoLink(id: string, userId: string, approvedBy: string, now: number): Promise<boolean>;
  revokeSsoLink(id: string, revokedBy: string, now: number): Promise<boolean>;
  saveSsoHandoff(tokenHash: string, userId: string, expiresAt: number): Promise<void>;
  /** Single use: returns the user id once, then never again. */
  consumeSsoHandoff(tokenHash: string, now: number): Promise<string | null>;
  findUser(id: string): Promise<CmsUser | null>;
  addUser(user: CmsUser): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  saveSession(tokenHash: string, session: Session): Promise<void>;
  touchSession(tokenHash: string, lastSeenAt: number): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  listArticles(): Promise<NewsRecord[]>;
  getArticle(id: string): Promise<NewsRecord | null>;
  saveArticle(article: NewsRecord): Promise<void>;
  /** The article write and its audit row succeed or fail together. */
  saveArticleWithAudit(article: NewsRecord, audit: Omit<AuditRecord, "createdAt">): Promise<void>;
  saveMedia(record: MediaRecord): Promise<void>;
  listMedia(articleId: string): Promise<MediaRecord[]>;
  deleteMedia(articleId: string): Promise<void>;
  appendAudit(record: AuditRecord): Promise<void>;
  listAudit(): Promise<AuditRecord[]>;
  close(): Promise<void>;
};

type ArticleRow = {
  id: string;
  status: NewsRecord["status"];
  pinned: number;
  author_id: string;
  reviewer_id: string | null;
  publisher_id: string | null;
  title_th: string;
  title_en: string;
  source: string;
  revision_reason: string | null;
  returned_by: string | null;
  body_th: string | null;
  body_en: string | null;
  published_at: Date | null;
  withdrawn_at: Date | null;
  withdrawn_by: string | null;
  withdrawal_reason: string | null;
  revision_no: number | null;
  published_snapshot: string | null;
};

const paragraphs = (value: string | null) =>
  (value ?? "")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

// A snapshot this repository wrote is JSON by construction; one that is not is a bug worth
// failing on rather than a published article that quietly disappears from the export.
const snapshot = (value: string | null): PublishedSnapshot | undefined =>
  value ? (JSON.parse(value) as PublishedSnapshot) : undefined;

// Audit rows written before this table carried state hold '' or plain text rather than JSON.
const parseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toRecord = (row: ArticleRow): NewsRecord => ({
  id: row.id,
  status: row.status,
  pinned: Boolean(row.pinned),
  authorId: row.author_id,
  reviewerId: row.reviewer_id ?? undefined,
  publisherId: row.publisher_id ?? undefined,
  titleTh: row.title_th,
  titleEn: row.title_en,
  source: row.source,
  revisionReason: row.revision_reason ?? undefined,
  returnedBy: row.returned_by ?? undefined,
  bodyTh: paragraphs(row.body_th),
  bodyEn: paragraphs(row.body_en),
  publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
  withdrawnAt: row.withdrawn_at ? new Date(row.withdrawn_at).toISOString() : undefined,
  withdrawnBy: row.withdrawn_by ?? undefined,
  withdrawalReason: row.withdrawal_reason ?? undefined,
  revisionNo: row.revision_no ?? 0,
  publishedSnapshot: snapshot(row.published_snapshot),
});

export type MysqlConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

// Timestamps cross the wire as DATETIME in UTC; the runtime works in epoch milliseconds.
const asDate = (ms: number) => new Date(ms);
type DocRow = {
  code: string; category: string; title_th: string; title_en: string; doc_type: string; version: string;
  status: RegistryDocument["status"]; visibility: RegistryDocument["visibility"]; storage_url: string;
  note: string; created_by: string; updated_at: Date; download_count: number;
  link_status: "ok" | "broken" | "unreachable" | null; link_checked_at: Date | null;
};
type AnRow = {
  code: string; kind: Announcement["kind"]; title_th: string; title_en: string; body_th: string; body_en: string; link_url: string;
  starts_at: Date; ends_at: Date; status: Announcement["status"]; created_by: string; updated_at: Date;
};
const toAnnouncement = (r: AnRow): Announcement => ({
  code: r.code, kind: r.kind, titleTh: r.title_th, titleEn: r.title_en, bodyTh: r.body_th, bodyEn: r.body_en, linkUrl: r.link_url,
  startsAt: asMillis(r.starts_at), endsAt: asMillis(r.ends_at), status: r.status, createdBy: r.created_by, updatedAt: asMillis(r.updated_at),
});
type CtRow = {
  code: string; name: string; email: string; subject: string; message: string; locale: "th" | "en";
  notice_version: string; consented_at: Date; status: ContactStatus; created_at: Date;
};
const toContact = (r: CtRow): ContactMessage => ({
  code: r.code, name: r.name, email: r.email, subject: r.subject, message: r.message, locale: r.locale,
  noticeVersion: r.notice_version, consentedAt: asMillis(r.consented_at), status: r.status, createdAt: asMillis(r.created_at),
});
type EvRow = {
  code: string; title_th: string; title_en: string; description_th: string; description_en: string; location_th: string; location_en: string;
  starts_at: Date; ends_at: Date | null; status: EventRecord["status"]; created_by: string; updated_at: Date;
};
const toEvent = (r: EvRow): EventRecord => ({
  code: r.code, titleTh: r.title_th, titleEn: r.title_en, descriptionTh: r.description_th, descriptionEn: r.description_en,
  locationTh: r.location_th, locationEn: r.location_en, startsAt: asMillis(r.starts_at), endsAt: r.ends_at ? asMillis(r.ends_at) : null,
  status: r.status, createdBy: r.created_by, updatedAt: asMillis(r.updated_at),
});
type KbRow = {
  code: string; kind: "faq"; topic: string; question_th: string; question_en: string; answer_th: string; answer_en: string;
  status: KnowledgeEntry["status"]; sort_order: number; created_by: string; updated_at: Date;
};
const toKb = (r: KbRow): KnowledgeEntry => ({
  code: r.code, kind: r.kind, topic: r.topic, questionTh: r.question_th, questionEn: r.question_en, answerTh: r.answer_th, answerEn: r.answer_en,
  status: r.status, sortOrder: Number(r.sort_order), createdBy: r.created_by, updatedAt: asMillis(r.updated_at),
});
const toDoc = (r: DocRow): RegistryDocument => ({
  code: r.code, category: r.category, titleTh: r.title_th, titleEn: r.title_en, docType: r.doc_type,
  version: r.version, status: r.status, visibility: r.visibility, storageUrl: r.storage_url, note: r.note,
  createdBy: r.created_by, updatedAt: asMillis(r.updated_at), downloadCount: Number(r.download_count),
  linkStatus: r.link_status ?? null, linkCheckedAt: r.link_checked_at ? asMillis(r.link_checked_at) : null,
});
type SsoRow = {
  id: string;
  subject_key: string;
  status: SsoLink["status"];
  user_id: string | null;
  requested_at: Date;
  approved_by: string | null;
  approved_at: Date | null;
};
const toSsoLink = (row: SsoRow): SsoLink => ({
  id: row.id,
  subjectKey: row.subject_key,
  status: row.status,
  userId: row.user_id,
  requestedAt: asMillis(row.requested_at),
  approvedBy: row.approved_by,
  approvedAt: row.approved_at ? asMillis(row.approved_at) : null,
});
const asMillis = (value: unknown) => (value instanceof Date ? value.getTime() : new Date(String(value)).getTime());

export async function createMysqlRepository(config: MysqlConfig): Promise<Repository> {
  const pool = mysql.createPool({
    ...config,
    connectionLimit: 5,
    timezone: "Z",
    // The runtime compares timestamps itself; keeping dates as Date objects avoids
    // server-timezone surprises on the database host.
    dateStrings: false,
    supportBigNumbers: true,
  });

  // Both writers take the handle to run on: the pool for a lone write, one connection inside a transaction.
  const insertArticle = (db: Pick<mysql.Pool, "query">, article: NewsRecord) =>
    db.query(
        `INSERT INTO news_articles
           (id, status, pinned, author_id, reviewer_id, publisher_id, title_th, title_en, source, revision_reason, returned_by, body_th, body_en, published_at, withdrawn_at, withdrawn_by, withdrawal_reason, revision_no, published_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status), pinned = VALUES(pinned), reviewer_id = VALUES(reviewer_id),
           publisher_id = VALUES(publisher_id), title_th = VALUES(title_th), title_en = VALUES(title_en),
           source = VALUES(source), revision_reason = VALUES(revision_reason), returned_by = VALUES(returned_by),
           body_th = VALUES(body_th), body_en = VALUES(body_en),
           published_at = COALESCE(VALUES(published_at), published_at),
           withdrawn_at = COALESCE(VALUES(withdrawn_at), withdrawn_at),
           withdrawn_by = COALESCE(VALUES(withdrawn_by), withdrawn_by),
           withdrawal_reason = COALESCE(VALUES(withdrawal_reason), withdrawal_reason),
           revision_no = VALUES(revision_no),
           published_snapshot = COALESCE(VALUES(published_snapshot), published_snapshot)`,
        [
          article.id,
          article.status,
          article.pinned ? 1 : 0,
          article.authorId,
          article.reviewerId ?? null,
          article.publisherId ?? null,
          article.titleTh,
          article.titleEn,
          article.source,
          article.revisionReason ?? null,
          article.returnedBy ?? null,
          (article.bodyTh ?? []).join("\n\n"),
          (article.bodyEn ?? []).join("\n\n"),
          article.publishedAt ? new Date(article.publishedAt) : null,
          article.withdrawnAt ? new Date(article.withdrawnAt) : null,
          article.withdrawnBy ?? null,
          article.withdrawalReason ?? null,
          article.revisionNo ?? 0,
          article.publishedSnapshot ? JSON.stringify(article.publishedSnapshot) : null,
        ],
      );

  const insertAudit = (db: Pick<mysql.Pool, "query">, record: Omit<AuditRecord, "createdAt">) =>
    db.query(
        "INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          randomUUID(),
          record.actorId,
          record.action,
          record.entityType,
          record.entityId,
          JSON.stringify(record.before ?? {}),
          JSON.stringify(record.after ?? {}),
        ],
      );

  return {
    async findUser(id) {
      const [rows] = await pool.query("SELECT id, role, password_hash FROM users WHERE id = ?", [id]);
      const row = (rows as { id: string; role: RoleName; password_hash: string }[])[0];
      return row ? { id: row.id, role: row.role, passwordHash: row.password_hash } : null;
    },

    async addUser(user) {
      await pool.query(
        "INSERT INTO users (id, email, password_hash, role) VALUES (?, NULL, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)",
        [user.id, user.passwordHash, user.role],
      );
    },

    async getSession(tokenHash) {
      const [rows] = await pool.query(
        "SELECT user_id, created_at, last_seen_at FROM sessions WHERE token_hash = ?",
        [tokenHash],
      );
      const row = (rows as { user_id: string; created_at: Date; last_seen_at: Date }[])[0];
      if (!row) return null;
      return { userId: row.user_id, createdAt: asMillis(row.created_at), lastSeenAt: asMillis(row.last_seen_at) };
    },

    async saveSession(tokenHash, session) {
      // expires_at is derived from the absolute cap so a stale row can be pruned from SQL too.
      const expires = new Date(session.createdAt + 8 * 60 * 60 * 1000);
      await pool.query(
        "INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), last_seen_at = VALUES(last_seen_at)",
        [tokenHash, session.userId, asDate(session.createdAt), asDate(session.lastSeenAt), expires],
      );
    },

    async touchSession(tokenHash, lastSeenAt) {
      await pool.query("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?", [asDate(lastSeenAt), tokenHash]);
    },

    async deleteSession(tokenHash) {
      await pool.query("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
    },

    async listArticles() {
      const [rows] = await pool.query("SELECT * FROM news_articles");
      return (rows as ArticleRow[]).map(toRecord);
    },

    async getArticle(id) {
      const [rows] = await pool.query("SELECT * FROM news_articles WHERE id = ?", [id]);
      const row = (rows as ArticleRow[])[0];
      return row ? toRecord(row) : null;
    },

    async saveArticle(article) {
      // COALESCE keeps what an earlier write set: a save that carries no publication date must not
      // erase the one publish stamped, and one that carries no snapshot must not erase the live
      // version a revision is being edited against.
      await insertArticle(pool, article);
    },

    async saveArticleWithAudit(article, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await insertArticle(connection, article);
        await insertAudit(connection, audit);
        await connection.commit();
      } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
      } finally {
        connection.release();
      }
    },

    async saveMedia(record) {
      await pool.query(
        `INSERT INTO news_media
           (id, article_id, position, filename, mime, bytes, caption_th, caption_en, alt_th, alt_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           position = VALUES(position), filename = VALUES(filename), mime = VALUES(mime),
           bytes = VALUES(bytes), caption_th = VALUES(caption_th), caption_en = VALUES(caption_en),
           alt_th = VALUES(alt_th), alt_en = VALUES(alt_en)`,
        [
          record.id,
          record.articleId,
          record.position,
          record.filename,
          record.mime,
          record.bytes,
          record.captionTh,
          record.captionEn,
          record.altTh,
          record.altEn,
        ],
      );
    },

    async listMedia(articleId) {
      const [rows] = await pool.query("SELECT * FROM news_media WHERE article_id = ? ORDER BY position", [articleId]);
      return (rows as {
        id: string; article_id: string; position: number; filename: string; mime: string; bytes: number;
        caption_th: string; caption_en: string; alt_th: string; alt_en: string;
      }[]).map((row) => ({
        id: row.id,
        articleId: row.article_id,
        position: row.position,
        filename: row.filename,
        mime: row.mime,
        bytes: row.bytes,
        captionTh: row.caption_th,
        captionEn: row.caption_en,
        altTh: row.alt_th,
        altEn: row.alt_en,
      }));
    },

    async deleteMedia(articleId) {
      await pool.query("DELETE FROM news_media WHERE article_id = ?", [articleId]);
    },

    async appendAudit(record) {
      await insertAudit(pool, record);
    },

    async recentAudit(limit) {
      const [rows] = await pool.query("SELECT actor_id, action, entity_type, entity_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?", [Math.max(1, Math.min(50, limit))]);
      return (rows as { actor_id: string; action: string; entity_type: string; entity_id: string; created_at: Date }[]).map((r) => ({
        actorId: r.actor_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, createdAt: new Date(r.created_at).toISOString(),
      }));
    },

    async listAudit() {
      const [rows] = await pool.query(
        "SELECT actor_id, action, entity_type, entity_id, before_json, after_json, created_at FROM audit_logs ORDER BY created_at",
      );
      return (rows as {
        actor_id: string; action: string; entity_type: string; entity_id: string;
        before_json: string; after_json: string; created_at: Date;
      }[]).map((row) => ({
        actorId: row.actor_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        // Rows written before the lifecycle work carry '' rather than JSON; hand those back as text.
        before: parseJson(row.before_json),
        after: parseJson(row.after_json),
        createdAt: new Date(row.created_at).toISOString(),
      }));
    },

    async createAnnouncement(a, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)), 0) AS n FROM announcements FOR UPDATE");
        const code = formatAnnouncementCode(Number((rows as { n: number }[])[0].n) + 1);
        await connection.query(
          "INSERT INTO announcements (code, kind, title_th, title_en, body_th, body_en, link_url, starts_at, ends_at, status, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [code, a.kind, a.titleTh, a.titleEn, a.bodyTh, a.bodyEn, a.linkUrl, asDate(a.startsAt), asDate(a.endsAt), a.status, a.createdBy, asDate(a.updatedAt)],
        );
        await insertAudit(connection, { ...audit, entityId: code });
        await connection.commit();
        return { ...a, code };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listAnnouncements() {
      const [rows] = await pool.query("SELECT * FROM announcements ORDER BY starts_at DESC, code DESC");
      return (rows as AnRow[]).map(toAnnouncement);
    },

    async getAnnouncement(code) {
      const [rows] = await pool.query("SELECT * FROM announcements WHERE code = ?", [code]);
      const row = (rows as AnRow[])[0];
      return row ? toAnnouncement(row) : null;
    },

    async updateAnnouncement(a, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          "UPDATE announcements SET kind = ?, title_th = ?, title_en = ?, body_th = ?, body_en = ?, link_url = ?, starts_at = ?, ends_at = ?, status = ?, updated_at = ? WHERE code = ?",
          [a.kind, a.titleTh, a.titleEn, a.bodyTh, a.bodyEn, a.linkUrl, asDate(a.startsAt), asDate(a.endsAt), a.status, asDate(a.updatedAt), a.code],
        );
        await insertAudit(connection, audit);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async recordPageView(day, path, maxPaths) {
      const [exists] = await pool.query("SELECT 1 FROM analytics_daily WHERE day = ? AND path = ?", [day, path]);
      let target = path;
      if ((exists as unknown[]).length === 0) {
        const [count] = await pool.query("SELECT COUNT(*) AS n FROM analytics_daily WHERE day = ?", [day]);
        if (Number((count as { n: number }[])[0].n) >= maxPaths) target = "/other";
      }
      await pool.query("INSERT INTO analytics_daily (day, path, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1", [day, target]);
    },

    async listPageViews(sinceDay) {
      const [rows] = await pool.query("SELECT DATE_FORMAT(day, '%Y-%m-%d') AS day, path, hits FROM analytics_daily WHERE day >= ? ORDER BY day DESC, hits DESC", [sinceDay]);
      return (rows as { day: string; path: string; hits: number }[]).map((r) => ({ day: r.day, path: r.path, hits: Number(r.hits) }));
    },

    async createContactMessage(m, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)), 0) AS n FROM contact_messages FOR UPDATE");
        const code = formatContactCode(Number((rows as { n: number }[])[0].n) + 1);
        await connection.query(
          "INSERT INTO contact_messages (code, name, email, subject, message, locale, notice_version, consented_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [code, m.name, m.email, m.subject, m.message, m.locale, m.noticeVersion, asDate(m.consentedAt), m.status, asDate(m.createdAt)],
        );
        await insertAudit(connection, { ...audit, entityId: code });
        await connection.commit();
        return { ...m, code };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listContactMessages() {
      const [rows] = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC, code DESC");
      return (rows as CtRow[]).map(toContact);
    },

    async setContactStatus(code, status, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.query("UPDATE contact_messages SET status = ? WHERE code = ?", [status, code]);
        if ((result as { affectedRows: number }).affectedRows !== 1) {
          await connection.rollback();
          return false;
        }
        await insertAudit(connection, audit);
        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async purgeContactMessages(cutoff) {
      const [result] = await pool.query("DELETE FROM contact_messages WHERE created_at < ?", [asDate(cutoff)]);
      return (result as { affectedRows: number }).affectedRows;
    },

    async createEvent(event, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)), 0) AS n FROM events FOR UPDATE");
        const code = formatEventCode(Number((rows as { n: number }[])[0].n) + 1);
        await connection.query(
          "INSERT INTO events (code, title_th, title_en, description_th, description_en, location_th, location_en, starts_at, ends_at, status, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [code, event.titleTh, event.titleEn, event.descriptionTh, event.descriptionEn, event.locationTh, event.locationEn, asDate(event.startsAt), event.endsAt === null ? null : asDate(event.endsAt), event.status, event.createdBy, asDate(event.updatedAt)],
        );
        await insertAudit(connection, { ...audit, entityId: code });
        await connection.commit();
        return { ...event, code };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listEvents() {
      const [rows] = await pool.query("SELECT * FROM events ORDER BY starts_at, code");
      return (rows as EvRow[]).map(toEvent);
    },

    async getEvent(code) {
      const [rows] = await pool.query("SELECT * FROM events WHERE code = ?", [code]);
      const row = (rows as EvRow[])[0];
      return row ? toEvent(row) : null;
    },

    async updateEvent(event, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          "UPDATE events SET title_th = ?, title_en = ?, description_th = ?, description_en = ?, location_th = ?, location_en = ?, starts_at = ?, ends_at = ?, status = ?, updated_at = ? WHERE code = ?",
          [event.titleTh, event.titleEn, event.descriptionTh, event.descriptionEn, event.locationTh, event.locationEn, asDate(event.startsAt), event.endsAt === null ? null : asDate(event.endsAt), event.status, asDate(event.updatedAt), event.code],
        );
        await insertAudit(connection, audit);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async createKnowledge(entry, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)), 0) AS n FROM knowledge_entries FOR UPDATE");
        const code = formatKnowledgeCode(Number((rows as { n: number }[])[0].n) + 1);
        await connection.query(
          "INSERT INTO knowledge_entries (code, kind, topic, question_th, question_en, answer_th, answer_en, status, sort_order, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [code, entry.kind, entry.topic, entry.questionTh, entry.questionEn, entry.answerTh, entry.answerEn, entry.status, entry.sortOrder, entry.createdBy, asDate(entry.updatedAt)],
        );
        await insertAudit(connection, { ...audit, entityId: code });
        await connection.commit();
        return { ...entry, code };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listKnowledge() {
      const [rows] = await pool.query("SELECT * FROM knowledge_entries ORDER BY sort_order, code");
      return (rows as KbRow[]).map(toKb);
    },

    async getKnowledge(code) {
      const [rows] = await pool.query("SELECT * FROM knowledge_entries WHERE code = ?", [code]);
      const row = (rows as KbRow[])[0];
      return row ? toKb(row) : null;
    },

    async updateKnowledge(entry, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          "UPDATE knowledge_entries SET topic = ?, question_th = ?, question_en = ?, answer_th = ?, answer_en = ?, status = ?, sort_order = ?, updated_at = ? WHERE code = ?",
          [entry.topic, entry.questionTh, entry.questionEn, entry.answerTh, entry.answerEn, entry.status, entry.sortOrder, asDate(entry.updatedAt), entry.code],
        );
        await insertAudit(connection, audit);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async createDocument(doc, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)), 0) AS n FROM documents FOR UPDATE");
        const code = formatDocumentCode(Number((rows as { n: number }[])[0].n) + 1);
        await connection.query(
          "INSERT INTO documents (code, category, title_th, title_en, doc_type, version, status, visibility, storage_url, note, created_by, updated_at, download_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
          [code, doc.category, doc.titleTh, doc.titleEn, doc.docType, doc.version, doc.status, doc.visibility, doc.storageUrl, doc.note, doc.createdBy, asDate(doc.updatedAt)],
        );
        await connection.query(
          "INSERT INTO document_versions (id, code, version, storage_url, changed_by, changed_at, change_note) VALUES (?, ?, ?, ?, ?, ?, '')",
          [randomUUID(), code, doc.version, doc.storageUrl, doc.createdBy, asDate(doc.updatedAt)],
        );
        await insertAudit(connection, { ...audit, entityId: code });
        await connection.commit();
        return { ...doc, code, downloadCount: 0 };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listDocuments() {
      const [rows] = await pool.query("SELECT * FROM documents ORDER BY code");
      return (rows as DocRow[]).map(toDoc);
    },

    async getDocument(code) {
      const [rows] = await pool.query("SELECT * FROM documents WHERE code = ?", [code]);
      const row = (rows as DocRow[])[0];
      return row ? toDoc(row) : null;
    },

    async updateDocument(doc, version, audit) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          "UPDATE documents SET category = ?, title_th = ?, title_en = ?, doc_type = ?, version = ?, status = ?, visibility = ?, storage_url = ?, note = ?, updated_at = ? WHERE code = ?",
          [doc.category, doc.titleTh, doc.titleEn, doc.docType, doc.version, doc.status, doc.visibility, doc.storageUrl, doc.note, asDate(doc.updatedAt), doc.code],
        );
        if (version) {
          await connection.query(
            "INSERT INTO document_versions (id, code, version, storage_url, changed_by, changed_at, change_note) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [randomUUID(), doc.code, version.version, version.storageUrl, version.changedBy, asDate(version.changedAt), version.changeNote],
          );
        }
        await insertAudit(connection, audit);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listDocumentVersions(code) {
      const [rows] = await pool.query("SELECT version, storage_url, changed_by, changed_at, change_note FROM document_versions WHERE code = ? ORDER BY changed_at DESC", [code]);
      return (rows as { version: string; storage_url: string; changed_by: string; changed_at: Date; change_note: string }[]).map((r) => ({
        version: r.version,
        storageUrl: r.storage_url,
        changedBy: r.changed_by,
        changedAt: asMillis(r.changed_at),
        changeNote: r.change_note,
      }));
    },

    async setLinkHealth(code, status, checkedAt) {
      await pool.query("UPDATE documents SET link_status = ?, link_checked_at = ? WHERE code = ?", [status, asDate(checkedAt), code]);
    },

    async countDownload(code) {
      const [result] = await pool.query(
        "UPDATE documents SET download_count = download_count + 1 WHERE code = ? AND status = 'current' AND visibility = 'public'",
        [code],
      );
      if ((result as { affectedRows: number }).affectedRows !== 1) return null;
      const [rows] = await pool.query("SELECT * FROM documents WHERE code = ?", [code]);
      return toDoc((rows as DocRow[])[0]);
    },

    async findSsoLink(subjectKey) {
      const [rows] = await pool.query("SELECT * FROM sso_identity_links WHERE subject_key = ?", [subjectKey]);
      const row = (rows as SsoRow[])[0];
      return row ? toSsoLink(row) : null;
    },

    async requestSsoLink(subjectKey, now) {
      await pool.query(
        "INSERT IGNORE INTO sso_identity_links (id, subject_key, status, requested_at) VALUES (?, ?, 'pending', ?)",
        [randomUUID(), subjectKey, asDate(now)],
      );
      const [rows] = await pool.query("SELECT * FROM sso_identity_links WHERE subject_key = ?", [subjectKey]);
      return toSsoLink((rows as SsoRow[])[0]);
    },

    async listSsoLinks() {
      const [rows] = await pool.query("SELECT * FROM sso_identity_links ORDER BY requested_at DESC LIMIT 500");
      return (rows as SsoRow[]).map(toSsoLink);
    },

    async approveSsoLink(id, userId, approvedBy, now) {
      // One approved link per user: the NOT EXISTS keeps two identities from sharing an account.
      const [result] = await pool.query(
        `UPDATE sso_identity_links SET status = 'approved', user_id = ?, approved_by = ?, approved_at = ?
         WHERE id = ? AND status = 'pending'
           AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM sso_identity_links WHERE user_id = ? AND status = 'approved') AS x)`,
        [userId, approvedBy, asDate(now), id, userId],
      );
      return (result as { affectedRows: number }).affectedRows === 1;
    },

    async revokeSsoLink(id, revokedBy, now) {
      const [result] = await pool.query(
        "UPDATE sso_identity_links SET status = 'revoked', revoked_by = ?, revoked_at = ? WHERE id = ? AND status <> 'revoked'",
        [revokedBy, asDate(now), id],
      );
      return (result as { affectedRows: number }).affectedRows === 1;
    },

    async saveSsoHandoff(tokenHash, userId, expiresAt) {
      await pool.query("DELETE FROM sso_handoffs WHERE expires_at < ?", [asDate(Date.now())]);
      await pool.query("INSERT INTO sso_handoffs (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
        tokenHash,
        userId,
        asDate(expiresAt),
      ]);
    },

    async consumeSsoHandoff(tokenHash, now) {
      const [rows] = await pool.query("SELECT user_id, expires_at FROM sso_handoffs WHERE token_hash = ?", [tokenHash]);
      const row = (rows as { user_id: string; expires_at: Date }[])[0];
      if (!row) return null;
      const [result] = await pool.query("DELETE FROM sso_handoffs WHERE token_hash = ?", [tokenHash]);
      if ((result as { affectedRows: number }).affectedRows !== 1) return null;
      return asMillis(row.expires_at) > now ? row.user_id : null;
    },

    async close() {
      await pool.end();
    },
  };
}
