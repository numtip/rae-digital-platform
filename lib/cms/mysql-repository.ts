import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import type { NewsRecord } from "./news-workflow.ts";
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
  createdAt: string;
};

export type Repository = {
  findUser(id: string): Promise<CmsUser | null>;
  addUser(user: CmsUser): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  saveSession(tokenHash: string, session: Session): Promise<void>;
  touchSession(tokenHash: string, lastSeenAt: number): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  listArticles(): Promise<NewsRecord[]>;
  getArticle(id: string): Promise<NewsRecord | null>;
  saveArticle(article: NewsRecord): Promise<void>;
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
};

const paragraphs = (value: string | null) =>
  (value ?? "")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

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
      // COALESCE on published_at: a save that carries no date must not erase the one publish set.
      await pool.query(
        `INSERT INTO news_articles
           (id, status, pinned, author_id, reviewer_id, publisher_id, title_th, title_en, source, revision_reason, returned_by, body_th, body_en, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status), pinned = VALUES(pinned), reviewer_id = VALUES(reviewer_id),
           publisher_id = VALUES(publisher_id), title_th = VALUES(title_th), title_en = VALUES(title_en),
           source = VALUES(source), revision_reason = VALUES(revision_reason), returned_by = VALUES(returned_by),
           body_th = VALUES(body_th), body_en = VALUES(body_en),
           published_at = COALESCE(VALUES(published_at), published_at)`,
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
        ],
      );
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
      await pool.query(
        "INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, before_json, after_json) VALUES (?, ?, ?, ?, ?, '{}', '{}')",
        [randomUUID(), record.actorId, record.action, record.entityType, record.entityId],
      );
    },

    async listAudit() {
      const [rows] = await pool.query(
        "SELECT actor_id, action, entity_type, entity_id, created_at FROM audit_logs ORDER BY created_at",
      );
      return (rows as { actor_id: string; action: string; entity_type: string; entity_id: string; created_at: Date }[]).map(
        (row) => ({
          actorId: row.actor_id,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          createdAt: new Date(row.created_at).toISOString(),
        }),
      );
    },

    async close() {
      await pool.end();
    },
  };
}
