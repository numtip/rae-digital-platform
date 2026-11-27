import { createServer } from "node:http";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertArticleImage, extensionFor, MediaRejected, SAFE_ID, SAFE_MEDIA_FILE } from "../lib/cms/media.ts";
import {
  submitForReview,
  approveNews,
  publishNews,
  returnForRevision,
  revisePublished,
  unpublishNews,
} from "../lib/cms/news-workflow.ts";
import { publishedArticlesForExport, publishedSnapshotOf } from "../lib/cms/publish.ts";
import { assertLocalPassword } from "../lib/cms/validation.ts";
import { hasPermission, requirePermission } from "../lib/cms/permissions.ts";
import { hashSessionToken, isSessionExpired, openSession } from "../lib/cms/session.ts";
import { FAILURE_WINDOW_MS, createLoginThrottle } from "../lib/cms/login-throttle.ts";
import {
  applyDocumentUpdate,
  checkLink,
  isPublicDocument,
  publicDocumentView,
  validateNewDocument,
} from "../lib/cms/document-registry.ts";
import { buildOpenApi } from "../lib/cms/openapi.ts";
import { applyDepartmentUpdate, bySort, formatDepartmentCode, publicDepartments, validateDepartment } from "../lib/cms/department-registry.ts";
import { applyAnnouncementUpdate, byStartDesc, formatAnnouncementCode, isLiveAnnouncement, publicAnnouncementView, validateAnnouncement } from "../lib/cms/announcement-registry.ts";
import { MAX_PATHS_PER_DAY, bangkokDay, normalizeAnalyticsPath, readAnalyticsConfig } from "../lib/cms/analytics.ts";
import { CONTACT_STATUSES, ContactInvalid, formatContactCode, readContactConfig, validateContact } from "../lib/cms/contact-registry.ts";
import { applyEventUpdate, byStart, formatEventCode, isPublicEvent, publicEventView, validateEvent } from "../lib/cms/event-registry.ts";
import {
  applyKnowledgeUpdate,
  bySortOrder,
  formatKnowledgeCode,
  isPublicKnowledge,
  publicKnowledgeView,
  validateKnowledge,
} from "../lib/cms/knowledge-registry.ts";
import { createSso } from "./sso.mjs";
import { clientKey, createIpLimiter } from "../lib/cms/ip-rate-limit.ts";
import { createMysqlRepository } from "../lib/cms/mysql-repository.ts";

// The runtime keeps no state of its own any more: every record goes through a Repository.
// Memory is the default so the desk runs without a database; the isolated rae_cms database
// is used as soon as RAE_CMS_DB_HOST is configured (see repositoryFromEnv).

const users = new Map();
const sessions = new Map();
const articles = new Map();
const audit = [];
const media = new Map();
const ssoLinks = new Map();
const ssoHandoffs = new Map();
const throttle = createLoginThrottle();
const documents = new Map();
const knowledge = new Map();
const events = new Map();
const contactMessages = new Map();
const pageViews = new Map();
const announcements = new Map();
const departments = new Map();
const viewsByIp = createIpLimiter({ max: 120, windowMs: 60_000 });
const contactByIp = createIpLimiter({ max: 5, windowMs: 10 * 60_000 });
const documentVersions = new Map();
const downloadByIp = createIpLimiter({ max: 60, windowMs: 60_000 });
const loginByIp = createIpLimiter({ max: 30, windowMs: 60_000 });

export function hashPassword(password) {
  assertLocalPassword(password);
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function resetRuntime() {
  users.clear();
  throttle.reset();
  loginByIp.reset();
  downloadByIp.reset();
  documents.clear();
  knowledge.clear();
  events.clear();
  contactMessages.clear();
  pageViews.clear();
  announcements.clear();
  departments.clear();
  viewsByIp.reset();
  contactByIp.reset();
  documentVersions.clear();
  sessions.clear();
  articles.clear();
  media.clear();
  ssoLinks.clear();
  ssoHandoffs.clear();
  audit.length = 0;
}

export function addUser({ id, role, password }) {
  users.set(id, { id, role, passwordHash: hashPassword(password) });
}

export async function addUserToRepository(repository, { id, role, password }) {
  await repository.addUser({ id, role, passwordHash: hashPassword(password) });
}

/** The in-memory repository over the module maps — the default, and what tests inspect. */
export function memoryRepository() {
  return {
    async findUser(id) {
      return users.get(id) ?? null;
    },
    async addUser(user) {
      users.set(user.id, user);
    },
    async getSession(tokenHash) {
      return sessions.get(tokenHash) ?? null;
    },
    async saveSession(tokenHash, session) {
      sessions.set(tokenHash, session);
    },
    async touchSession(tokenHash, lastSeenAt) {
      const session = sessions.get(tokenHash);
      if (session) session.lastSeenAt = lastSeenAt;
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
    async listArticles() {
      return [...articles.values()];
    },
    async getArticle(id) {
      return articles.get(id) ?? null;
    },
    async saveArticle(article) {
      articles.set(article.id, article);
    },
    async saveArticleWithAudit(article, record) {
      const before = articles.get(article.id);
      articles.set(article.id, article);
      try {
        await this.appendAudit(record);
      } catch (error) {
        if (before) articles.set(article.id, before);
        else articles.delete(article.id);
        throw error;
      }
    },
    async saveMedia(record) {
      const list = (media.get(record.articleId) ?? []).filter((item) => item.id !== record.id);
      list.push(record);
      list.sort((a, b) => a.position - b.position);
      media.set(record.articleId, list);
    },
    async listMedia(articleId) {
      return [...(media.get(articleId) ?? [])];
    },
    async deleteMedia(articleId) {
      media.delete(articleId);
    },
    async appendAudit(record) {
      audit.push(record);
    },
    async recentAudit(limit) {
      return audit.slice(-Math.max(1, Math.min(50, limit))).reverse().map((r) => ({ actorId: r.actorId, action: r.action, entityType: r.entityType, entityId: r.entityId, createdAt: r.createdAt ?? "" }));
    },
    async listAudit() {
      return [...audit];
    },
    async createDepartment(d, audit) {
      const n = [...departments.keys()].reduce((max, code) => Math.max(max, Number(code.slice(7))), 0) + 1;
      const code = formatDepartmentCode(n);
      departments.set(code, { ...d, code });
      await this.appendAudit({ ...audit, entityId: code });
      return { ...d, code };
    },
    async listDepartments() {
      return [...departments.values()].map((d) => ({ ...d })).sort(bySort);
    },
    async getDepartment(code) {
      const d = departments.get(code);
      return d ? { ...d } : null;
    },
    async updateDepartment(d, audit) {
      departments.set(d.code, { ...d });
      await this.appendAudit(audit);
    },
    async createAnnouncement(a, audit) {
      const n = [...announcements.keys()].reduce((max, code) => Math.max(max, Number(code.slice(7))), 0) + 1;
      const code = formatAnnouncementCode(n);
      announcements.set(code, { ...a, code });
      await this.appendAudit({ ...audit, entityId: code });
      return { ...a, code };
    },
    async listAnnouncements() {
      return [...announcements.values()].map((a) => ({ ...a })).sort(byStartDesc);
    },
    async getAnnouncement(code) {
      const a = announcements.get(code);
      return a ? { ...a } : null;
    },
    async updateAnnouncement(a, audit) {
      announcements.set(a.code, { ...a });
      await this.appendAudit(audit);
    },
    async recordPageView(day, path, maxPaths) {
      const todays = [...pageViews.keys()].filter((k) => k.startsWith(`${day}|`));
      const key = `${day}|${path}`;
      const target = !pageViews.has(key) && todays.length >= maxPaths ? `${day}|/other` : key;
      pageViews.set(target, (pageViews.get(target) ?? 0) + 1);
    },
    async listPageViews(sinceDay) {
      return [...pageViews.entries()].map(([k, hits]) => ({ day: k.split("|")[0], path: k.split("|")[1], hits })).filter((r) => r.day >= sinceDay).sort((a, b) => b.day.localeCompare(a.day) || b.hits - a.hits);
    },
    async createContactMessage(m, audit) {
      const n = [...contactMessages.keys()].reduce((max, code) => Math.max(max, Number(code.slice(7))), 0) + 1;
      const code = formatContactCode(n);
      contactMessages.set(code, { ...m, code });
      await this.appendAudit({ ...audit, entityId: code });
      return { ...m, code };
    },
    async listContactMessages() {
      return [...contactMessages.values()].map((m) => ({ ...m })).sort((a, b) => b.createdAt - a.createdAt || b.code.localeCompare(a.code));
    },
    async setContactStatus(code, status, audit) {
      const m = contactMessages.get(code);
      if (!m) return false;
      m.status = status;
      await this.appendAudit(audit);
      return true;
    },
    async purgeContactMessages(cutoff) {
      let n = 0;
      for (const [code, m] of contactMessages) if (m.createdAt < cutoff) { contactMessages.delete(code); n += 1; }
      return n;
    },
    async createEvent(event, audit) {
      const n = [...events.keys()].reduce((max, code) => Math.max(max, Number(code.slice(7))), 0) + 1;
      const code = formatEventCode(n);
      events.set(code, { ...event, code });
      await this.appendAudit({ ...audit, entityId: code });
      return { ...event, code };
    },
    async listEvents() {
      return [...events.values()].map((e) => ({ ...e })).sort(byStart);
    },
    async getEvent(code) {
      const e = events.get(code);
      return e ? { ...e } : null;
    },
    async updateEvent(event, audit) {
      events.set(event.code, { ...event });
      await this.appendAudit(audit);
    },
    async createKnowledge(entry, audit) {
      const n = [...knowledge.keys()].reduce((max, code) => Math.max(max, Number(code.slice(7))), 0) + 1;
      const code = formatKnowledgeCode(n);
      knowledge.set(code, { ...entry, code });
      await this.appendAudit({ ...audit, entityId: code });
      return { ...entry, code };
    },
    async listKnowledge() {
      return [...knowledge.values()].map((e) => ({ ...e })).sort(bySortOrder);
    },
    async getKnowledge(code) {
      const e = knowledge.get(code);
      return e ? { ...e } : null;
    },
    async updateKnowledge(entry, audit) {
      knowledge.set(entry.code, { ...entry });
      await this.appendAudit(audit);
    },
    async createDocument(doc, audit) {
      const n = [...documents.keys()].reduce((max, code) => Math.max(max, Number(code.slice(7))), 0) + 1;
      const code = `RAE-DC-${String(n).padStart(4, "0")}`;
      const record = { ...doc, code, downloadCount: 0 };
      documents.set(code, record);
      documentVersions.set(code, [{ version: doc.version, storageUrl: doc.storageUrl, changedBy: doc.createdBy, changedAt: doc.updatedAt, changeNote: "" }]);
      await this.appendAudit({ ...audit, entityId: code });
      return { ...record };
    },
    async listDocuments() {
      return [...documents.values()].map((d) => ({ ...d }));
    },
    async getDocument(code) {
      const d = documents.get(code);
      return d ? { ...d } : null;
    },
    async updateDocument(doc, version, audit) {
      documents.set(doc.code, { ...doc });
      if (version) documentVersions.set(doc.code, [version, ...(documentVersions.get(doc.code) ?? [])]);
      await this.appendAudit(audit);
    },
    async listDocumentVersions(code) {
      return [...(documentVersions.get(code) ?? [])];
    },
    async setLinkHealth(code, status, checkedAt) {
      const d = documents.get(code);
      if (d) Object.assign(d, { linkStatus: status, linkCheckedAt: checkedAt });
    },
    async countDownload(code) {
      const d = documents.get(code);
      if (!d || !isPublicDocument(d)) return null;
      d.downloadCount += 1;
      return { ...d };
    },
    async findSsoLink(subjectKey) {
      return ssoLinks.get(subjectKey) ?? null;
    },
    async requestSsoLink(subjectKey, now) {
      if (!ssoLinks.has(subjectKey)) {
        ssoLinks.set(subjectKey, { id: randomUUID(), subjectKey, status: "pending", userId: null, requestedAt: now, approvedBy: null, approvedAt: null });
      }
      return ssoLinks.get(subjectKey);
    },
    async listSsoLinks() {
      return [...ssoLinks.values()];
    },
    async approveSsoLink(id, userId, approvedBy, now) {
      const link = [...ssoLinks.values()].find((l) => l.id === id);
      if (!link || link.status !== "pending") return false;
      if ([...ssoLinks.values()].some((l) => l.status === "approved" && l.userId === userId)) return false;
      Object.assign(link, { status: "approved", userId, approvedBy, approvedAt: now });
      return true;
    },
    async revokeSsoLink(id) {
      const link = [...ssoLinks.values()].find((l) => l.id === id);
      if (!link || link.status === "revoked") return false;
      link.status = "revoked";
      return true;
    },
    async saveSsoHandoff(tokenHash, userId, expiresAt) {
      ssoHandoffs.set(tokenHash, { userId, expiresAt });
    },
    async consumeSsoHandoff(tokenHash, now) {
      const row = ssoHandoffs.get(tokenHash);
      ssoHandoffs.delete(tokenHash);
      return row && row.expiresAt > now ? row.userId : null;
    },
    async close() {},
  };
}

/** MySQL when the environment names a database, memory otherwise. */
export async function repositoryFromEnv(env = process.env) {
  if (!env.RAE_CMS_DB_HOST) return memoryRepository();
  return createMysqlRepository({
    host: env.RAE_CMS_DB_HOST,
    port: Number(env.RAE_CMS_DB_PORT ?? 3306),
    user: env.RAE_CMS_DB_USER ?? "",
    password: env.RAE_CMS_DB_PASSWORD ?? "",
    database: env.RAE_CMS_DB_NAME ?? "rae_cms",
  });
}

function passwordMatches(user, password) {
  const [salt, hash] = user.passwordHash.split(":");
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function actorFrom(request, now, repository) {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const key = hashSessionToken(token);
  const session = await repository.getSession(key);
  if (!session) return null;
  if (isSessionExpired(session, now)) {
    await repository.deleteSession(key);
    return null;
  }
  await repository.touchSession(key, now);
  return repository.findUser(session.userId);
}

// The site keeps a 30-second page cache and a tombstone file for withdrawn stories; both are
// updated only when this hook is called. A failure is logged loudly and never reported as success
// to the site, but the CMS write has already happened, so the request itself still answers 200.
export async function notifySite(payload, env = process.env, fetchImpl = fetch) {
  const secret = env.RAE_REVALIDATE_SECRET;
  // One or more renderers read this CMS (the admin-host build and the canonical /rae-landing build),
  // so the hook may be a comma-separated list. Every one must answer for the call to count as told.
  const hooks = String(env.RAE_SITE_REVALIDATE_URL ?? "http://127.0.0.1:3000/api/news-live/revalidate")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  if (!secret) {
    console.error("rae-cms: RAE_REVALIDATE_SECRET is not set; the site was NOT told about this change");
    return false;
  }
  const results = await Promise.all(
    hooks.map(async (hook) => {
      try {
        const result = await fetchImpl(hook, {
          method: "POST",
          headers: { "content-type": "application/json", "x-revalidate-secret": secret },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (!result.ok) throw new Error(`HTTP ${result.status}`);
        return true;
      } catch (error) {
        console.error(`rae-cms: the site was NOT told about this change (${hook}: ${error.message})`);
        return false;
      }
    }),
  );
  return results.every(Boolean);
}

/**
 * Checks every record that is (or could become) visible: current and draft ones. Obsolete and archived
 * records are not worth a request. Sequential on purpose: a registry of hundreds must not become a burst
 * against SharePoint. Returns counts so the caller (timer or desk button) can say what it found.
 */
// One pass at a time: a second request while one is running reports it instead of starting another.
const linkCheck = { running: false, finishedAt: null, counts: null };
export function startLinkCheck(repository, options = {}) {
  if (linkCheck.running) return false;
  linkCheck.running = true;
  checkDocumentLinks(repository, options)
    .then((counts) => Object.assign(linkCheck, { counts, finishedAt: (options.now ?? Date.now)() }))
    .catch((error) => console.error(`rae-cms: link check failed (${error.message})`))
    .finally(() => {
      linkCheck.running = false;
    });
  return true;
}
export const linkCheckState = () => ({ ...linkCheck });

export async function checkDocumentLinks(repository, { fetchImpl = fetch, now = () => Date.now() } = {}) {
  const counts = { ok: 0, broken: 0, unreachable: 0 };
  for (const doc of await repository.listDocuments()) {
    if (doc.status !== "current" && doc.status !== "draft") continue;
    const status = await checkLink(doc.storageUrl, fetchImpl);
    await repository.setLinkHealth(doc.code, status, now());
    counts[status] += 1;
  }
  return counts;
}

// One image may be 8 MB, which is ~11 MB once base64 encoded; 12 MB leaves room for the captions
// and rejects anything larger before it is buffered.
export const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

class PayloadTooLarge extends Error {
  constructor() {
    super("the request body is larger than 12 MB");
    this.name = "PayloadTooLarge";
    this.status = 413;
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const declared = Number(request.headers["content-length"] ?? 0);
    if (declared > MAX_REQUEST_BYTES) return reject(new PayloadTooLarge());
    const chunks = [];
    let received = 0;
    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > MAX_REQUEST_BYTES) {
        request.destroy();
        return reject(new PayloadTooLarge());
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

// A body arrives as an array of paragraphs or as text separated by blank lines; either way the
// stored shape is one paragraph per element.
function toParagraphs(value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function send(response, status, body, origin) {
  const headers = { "content-type": "application/json; charset=utf-8" };
  if (origin && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

function articleId(pathname) {
  const candidate = pathname.split("/")[3] ?? "";
  return SAFE_ID.test(candidate) ? candidate : "";
}

function mediaRoot(env = process.env) {
  return env.RAE_CMS_MEDIA_DIR ?? join(process.cwd(), ".cms-media");
}

// The preview is server-rendered HTML so the owner can look at a published article and its
// gallery without the public site and without the admin desk. Loopback only, published items
// only — a draft is never rendered here.
function renderPreview(article, mediaList, locale) {
  const thai = locale !== "en";
  const title = thai ? article.titleTh : article.titleEn || article.titleTh;
  const body = (thai ? article.bodyTh : article.bodyEn) ?? article.bodyTh ?? article.bodyEn ?? [];
  const figure = mediaList
    .map(
      (item) => `<figure>
        <img src="/v1/media/${article.id}/${item.filename}" alt="${escapeHtml((thai ? item.altTh : item.altEn) || title)}" loading="lazy" />
        <figcaption>${escapeHtml((thai ? item.captionTh : item.captionEn) || "")}</figcaption>
      </figure>`,
    )
    .join("\n");
  return `<!doctype html><html lang="${thai ? "th" : "en"}"><head><meta charset="utf-8" />
<title>${escapeHtml(title)} — CMS preview</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: system-ui, "Sarabun", sans-serif; background: #f6f7f5; color: #1f2937; }
  header { background: #014d35; color: #fff; padding: 24px 16px; }
  main { max-width: 56rem; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 1.6rem; line-height: 1.35; margin: 0 0 8px; }
  .meta { font-size: .85rem; opacity: .85; }
  .body p { font-size: 1.05rem; line-height: 1.75; }
  .gallery { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin: 24px 0; }
  figure { margin: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  figure img { width: 100%; height: 180px; object-fit: cover; display: block; background: #e5e7eb; }
  figcaption { font-size: .85rem; padding: 8px 10px; color: #4b5563; }
  .badge { display: inline-block; background: #b98a2e; color: #1f2937; font-size: .75rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  @media (max-width: 480px) { .gallery { grid-template-columns: 1fr; } figure img { height: 210px; } }
</style></head>
<body>
<header>
  <p class="meta"><span class="badge">CMS PREVIEW · STAGING</span></p>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(article.dateText ?? "")} · ${escapeHtml(article.source ?? "")}</p>
</header>
<main>
  <div class="gallery">${figure}</div>
  <div class="body">${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
</main>
</body></html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function createCmsServer({ now = () => Date.now(), repository = memoryRepository(), sso = null, contact = { enabled: false }, analytics = { enabled: false } } = {}) {
  const repo = repository;
  // Retention (M07): old messages are deleted lazily, at most once an hour, whenever the inbox is touched.
  let lastPurge = 0;
  const purgeContact = async () => {
    if (!contact.enabled || now() - lastPurge < 3600_000) return;
    lastPurge = now();
    await repo.purgeContactMessages(now() - contact.retentionDays * 86400_000);
  };
  const corsFor = (origin) => (contact.enabled && origin && contact.allowedOrigins.includes(origin) ? { "access-control-allow-origin": origin, vary: "Origin" } : {});
  const sendContact = (response, status, body, origin) => {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsFor(origin) });
    response.end(JSON.stringify(body));
  };
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname.startsWith("/v1/sso/")) {
        // Off unless explicitly enabled: an unconfigured deployment has no SSO surface at all.
        if (!sso) return send(response, 404, { error: "NOT_FOUND" }, request.headers.origin);
        const handled = await sso.handle(request, response, url, {
          actor: () => actorFrom(request, now(), repo),
          readBody,
          send,
          requirePermission,
          audit: (record) => repo.appendAudit({ ...record, before: {}, after: {}, createdAt: new Date(now()).toISOString() }),
        });
        if (handled) return;
        return send(response, 404, { error: "NOT_FOUND" }, request.headers.origin);
      }
      const origin = request.headers.origin;
      if (request.method === "OPTIONS") {
        const headers = { "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "access-control-allow-headers": "content-type, authorization", ...(url.pathname.startsWith("/v1/public/contact") ? corsFor(origin) : {}) };
        if (origin && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) headers["access-control-allow-origin"] = origin;
        response.writeHead(204, headers);
        response.end();
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/login") {
        // Per client first: one address sweeping many accounts is stopped here, before any lookup.
        const over = loginByIp.hit(clientKey(request.headers, request.socket?.remoteAddress), now());
        if (over.limited) {
          response.setHeader("retry-after", String(over.retryAfterSeconds));
          return send(response, 429, { error: "TOO_MANY_REQUESTS" }, origin);
        }
        const body = await readBody(request);
        const attemptKey = String(body.userId ?? "");
        if (throttle.isBlocked(attemptKey, now())) {
          response.setHeader("retry-after", String(Math.ceil(FAILURE_WINDOW_MS / 1000)));
          return send(response, 429, { error: "TOO_MANY_ATTEMPTS" }, origin);
        }
        const user = await repo.findUser(attemptKey);
        if (!user || !passwordMatches(user, String(body.password ?? ""))) {
          throttle.recordFailure(attemptKey, now());
          return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        }
        throttle.clear(attemptKey);
        const token = randomBytes(32).toString("base64url");
        await repo.saveSession(hashSessionToken(token), openSession(user.id, now()));
        return send(response, 200, { token }, origin);
      }

      // M03 Document Center. Public reads need no login and see only current, public records.
      if (request.method === "GET" && url.pathname === "/v1/public/documents") {
        const category = url.searchParams.get("category");
        const list = (await repo.listDocuments()).filter((d) => isPublicDocument(d) && (!category || d.category === category));
        return send(response, 200, { documents: list.map(publicDocumentView) }, origin);
      }
      const oneMatch = /^\/v1\/public\/documents\/(RAE-DC-\d{4,})$/.exec(url.pathname);
      if (request.method === "GET" && oneMatch) {
        const doc = await repo.getDocument(oneMatch[1]);
        if (!doc || !isPublicDocument(doc)) return send(response, 404, { error: "NOT_FOUND" }, origin);
        return send(response, 200, publicDocumentView(doc), origin);
      }
      const countMatch = /^\/v1\/public\/documents\/(RAE-DC-\d{4,})\/download$/.exec(url.pathname);
      if (request.method === "POST" && countMatch) {
        const over = downloadByIp.hit(clientKey(request.headers, request.socket?.remoteAddress), now());
        if (over.limited) {
          response.setHeader("retry-after", String(over.retryAfterSeconds));
          return send(response, 429, { error: "TOO_MANY_REQUESTS" }, origin);
        }
        const doc = await repo.countDownload(countMatch[1]);
        if (!doc) return send(response, 404, { error: "NOT_FOUND" }, origin);
        return send(response, 200, { url: doc.storageUrl }, origin);
      }
      // M18 dashboard: counts per module and (for roles with audit:read) the newest activity. Read only.
      if (request.method === "GET" && url.pathname === "/v1/dashboard") {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:review");
        const tally = (list, key) => list.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] ?? 0) + 1 }), {});
        const t = now();
        const [news, docs, faq, evs, ann, msgs] = await Promise.all([repo.listArticles(), repo.listDocuments(), repo.listKnowledge(), repo.listEvents(), repo.listAnnouncements(), repo.listContactMessages()]);
        const body = {
          generatedAt: new Date(t).toISOString(),
          news: tally(news, "status"),
          documents: tally(docs, "status"),
          documentLinksBroken: docs.filter((d) => d.linkStatus === "broken").length,
          knowledge: tally(faq, "status"),
          events: { ...tally(evs, "status"), upcoming: evs.filter((e) => e.status === "published" && (e.endsAt ?? e.startsAt) >= t).length },
          announcements: { ...tally(ann, "status"), liveNow: ann.filter((a) => isLiveAnnouncement(a, t)).length },
          contact: { enabled: contact.enabled, new: msgs.filter((m) => m.status === "new").length, total: msgs.length },
          views7d: analytics.enabled ? (await repo.listPageViews(bangkokDay(t - 6 * 86400_000))).reduce((n, r) => n + r.hits, 0) : null,
        };
        if (hasPermission(actor.role, "audit:read")) body.recent = await repo.recentAudit(10);
        return send(response, 200, body, origin);
      }
      // M23 public API description (OpenAPI 3.0.3) — read-only public endpoints only.
      if (request.method === "GET" && url.pathname === "/v1/public/openapi.json") {
        return send(response, 200, buildOpenApi("/cms-api"), origin);
      }
      // M13 departments. Public: published units whose whole chain is published.
      if (request.method === "GET" && url.pathname === "/v1/public/departments") {
        return send(response, 200, { departments: publicDepartments(await repo.listDepartments()) }, origin);
      }
      if (url.pathname === "/v1/departments" || url.pathname.startsWith("/v1/departments/")) {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:draft");
        const audit = (action, code) => ({ actorId: actor.id, action, entityType: "department", entityId: code });
        if (request.method === "GET" && url.pathname === "/v1/departments") {
          return send(response, 200, { departments: await repo.listDepartments() }, origin);
        }
        if (request.method === "POST" && url.pathname === "/v1/departments") {
          const fields = validateDepartment(await readBody(request), await repo.listDepartments(), null);
          if (fields.status !== "draft") requirePermission(actor.role, "news:publish");
          const record = await repo.createDepartment({ ...fields, createdBy: actor.id, updatedAt: now() }, audit("department.create", ""));
          await notifySite({});
          return send(response, 201, record, origin);
        }
        const dp = /^\/v1\/departments\/(RAE-DP-\d{4,})$/.exec(url.pathname);
        if (dp) {
          const current = await repo.getDepartment(dp[1]);
          if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
          if (request.method === "GET") return send(response, 200, current, origin);
          if (request.method === "PATCH") {
            const next = applyDepartmentUpdate(current, await readBody(request), await repo.listDepartments(), now());
            if (current.status === "published" || next.status === "published") requirePermission(actor.role, "news:publish");
            await repo.updateDepartment(next, audit("department.update", next.code));
            await notifySite({});
            return send(response, 200, next, origin);
          }
        }
        return send(response, 404, { error: "NOT_FOUND" }, origin);
      }
      // M17 announcements. The public list is decided here, now: published AND inside its window.
      if (request.method === "GET" && url.pathname === "/v1/public/announcements") {
        const live = (await repo.listAnnouncements()).filter((a) => isLiveAnnouncement(a, now()));
        response.setHeader("cache-control", "no-store");
        return send(response, 200, { announcements: live.map(publicAnnouncementView) }, origin);
      }
      if (url.pathname === "/v1/announcements" || url.pathname.startsWith("/v1/announcements/")) {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:draft");
        const audit = (action, code) => ({ actorId: actor.id, action, entityType: "announcement", entityId: code });
        if (request.method === "GET" && url.pathname === "/v1/announcements") {
          return send(response, 200, { announcements: await repo.listAnnouncements() }, origin);
        }
        if (request.method === "POST" && url.pathname === "/v1/announcements") {
          const fields = validateAnnouncement(await readBody(request));
          if (fields.status !== "draft") requirePermission(actor.role, "news:publish");
          const record = await repo.createAnnouncement({ ...fields, createdBy: actor.id, updatedAt: now() }, audit("announcement.create", ""));
          await notifySite({});
          return send(response, 201, record, origin);
        }
        const an = /^\/v1\/announcements\/(RAE-AN-\d{4,})$/.exec(url.pathname);
        if (an) {
          const current = await repo.getAnnouncement(an[1]);
          if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
          if (request.method === "GET") return send(response, 200, current, origin);
          if (request.method === "PATCH") {
            const next = applyAnnouncementUpdate(current, await readBody(request), now());
            if (current.status === "published" || next.status === "published") requirePermission(actor.role, "news:publish");
            await repo.updateAnnouncement(next, audit("announcement.update", next.code));
            await notifySite({});
            return send(response, 200, next, origin);
          }
        }
        return send(response, 404, { error: "NOT_FOUND" }, origin);
      }
      // M08 analytics. Off (404) unless enabled. A page view carries only a public path: no cookie, IP or user agent is kept.
      if (request.method === "POST" && url.pathname === "/v1/public/analytics/hit") {
        if (!analytics.enabled) return send(response, 404, { error: "NOT_FOUND" }, origin);
        if (analytics.allowedOrigins.length > 0 && origin && !analytics.allowedOrigins.includes(origin)) return send(response, 204, {}, origin);
        if (viewsByIp.hit(clientKey(request.headers, request.socket?.remoteAddress), now()).limited) return send(response, 204, {}, origin);
        // The beacon sends text/plain (a simple cross-origin request); readBody parses the JSON either way.
        const path = normalizeAnalyticsPath((await readBody(request)).path);
        if (path) await repo.recordPageView(bangkokDay(now()), path, MAX_PATHS_PER_DAY);
        response.writeHead(204);
        response.end();
        return;
      }
      if (request.method === "GET" && url.pathname === "/v1/analytics") {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:review");
        const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
        const rows = await repo.listPageViews(bangkokDay(now() - (days - 1) * 86400_000));
        return send(response, 200, { enabled: analytics.enabled, days, rows }, origin);
      }
      // M07 contact form. Off (404) until the owner has configured notice + retention; stores only what was typed.
      if (request.method === "GET" && url.pathname === "/v1/public/contact/config") {
        return sendContact(response, 200, contact.enabled ? { enabled: true, notice: contact.notice } : { enabled: false }, origin);
      }
      if (request.method === "POST" && url.pathname === "/v1/public/contact") {
        if (!contact.enabled) return sendContact(response, 404, { error: "NOT_FOUND" }, origin);
        const over = contactByIp.hit(clientKey(request.headers, request.socket?.remoteAddress), now());
        if (over.limited) {
          response.setHeader("retry-after", String(over.retryAfterSeconds));
          return sendContact(response, 429, { error: "TOO_MANY_REQUESTS" }, origin);
        }
        const input = await readBody(request);
        // Honeypot: a field no person sees. Answer as if it worked, store nothing.
        if (typeof input.website === "string" && input.website !== "") return sendContact(response, 202, { received: true }, origin);
        const fields = validateContact(input, contact.notice);
        await purgeContact();
        const stamp = now();
        const record = await repo.createContactMessage(
          { ...fields, noticeVersion: contact.notice.version, consentedAt: stamp, status: "new", createdAt: stamp },
          { actorId: "public", action: "contact.receive", entityType: "contact", before: {}, after: {} },
        );
        return sendContact(response, 202, { received: true, reference: record.code }, origin);
      }
      if (url.pathname === "/v1/contact-messages" || url.pathname.startsWith("/v1/contact-messages/")) {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:review");
        await purgeContact();
        if (request.method === "GET" && url.pathname === "/v1/contact-messages") {
          return send(response, 200, { messages: await repo.listContactMessages(), enabled: contact.enabled }, origin);
        }
        const one = /^\/v1\/contact-messages\/(RAE-CT-\d{5,})$/.exec(url.pathname);
        if (one && request.method === "PATCH") {
          const { status } = await readBody(request);
          if (!CONTACT_STATUSES.includes(status)) throw new ContactInvalid("unknown status");
          const ok = await repo.setContactStatus(one[1], status, { actorId: actor.id, action: "contact.status", entityType: "contact", entityId: one[1], before: {}, after: { status } });
          return send(response, ok ? 200 : 404, ok ? { code: one[1], status } : { error: "NOT_FOUND" }, origin);
        }
        return send(response, 404, { error: "NOT_FOUND" }, origin);
      }
      // M05 events. Public reads see published and cancelled events only.
      if (request.method === "GET" && url.pathname === "/v1/public/events") {
        const list = (await repo.listEvents()).filter(isPublicEvent).sort(byStart);
        return send(response, 200, { events: list.map(publicEventView) }, origin);
      }
      if (url.pathname === "/v1/events" || url.pathname.startsWith("/v1/events/")) {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:draft");
        const audit = (action, code) => ({ actorId: actor.id, action, entityType: "event", entityId: code });
        if (request.method === "GET" && url.pathname === "/v1/events") {
          return send(response, 200, { events: await repo.listEvents() }, origin);
        }
        if (request.method === "POST" && url.pathname === "/v1/events") {
          const fields = validateEvent(await readBody(request));
          if (fields.status !== "draft") requirePermission(actor.role, "news:publish");
          const record = await repo.createEvent({ ...fields, createdBy: actor.id, updatedAt: now() }, audit("event.create", ""));
          await notifySite({});
          return send(response, 201, record, origin);
        }
        const ev = /^\/v1\/events\/(RAE-EV-\d{4,})$/.exec(url.pathname);
        if (ev) {
          const current = await repo.getEvent(ev[1]);
          if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
          if (request.method === "GET") return send(response, 200, current, origin);
          if (request.method === "PATCH") {
            const next = applyEventUpdate(current, await readBody(request), now());
            // Anything that is, or becomes, public is a publisher's decision.
            if (isPublicEvent(current) || isPublicEvent(next)) requirePermission(actor.role, "news:publish");
            await repo.updateEvent(next, audit("event.update", next.code));
            await notifySite({});
            return send(response, 200, next, origin);
          }
        }
        return send(response, 404, { error: "NOT_FOUND" }, origin);
      }
      // M04 knowledge / FAQ. Public reads see published entries only.
      if (request.method === "GET" && url.pathname === "/v1/public/knowledge") {
        const list = (await repo.listKnowledge()).filter(isPublicKnowledge).sort(bySortOrder);
        return send(response, 200, { entries: list.map(publicKnowledgeView) }, origin);
      }
      if (url.pathname === "/v1/knowledge" || url.pathname.startsWith("/v1/knowledge/")) {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "news:draft");
        const audit = (action, code) => ({ actorId: actor.id, action, entityType: "knowledge", entityId: code });
        if (request.method === "GET" && url.pathname === "/v1/knowledge") {
          return send(response, 200, { entries: await repo.listKnowledge() }, origin);
        }
        if (request.method === "POST" && url.pathname === "/v1/knowledge") {
          const fields = validateKnowledge(await readBody(request));
          if (fields.status !== "draft") requirePermission(actor.role, "news:publish");
          const record = await repo.createKnowledge({ ...fields, createdBy: actor.id, updatedAt: now() }, audit("knowledge.create", ""));
          await notifySite({});
          return send(response, 201, record, origin);
        }
        const kb = /^\/v1\/knowledge\/(RAE-KB-\d{4,})$/.exec(url.pathname);
        if (kb) {
          const current = await repo.getKnowledge(kb[1]);
          if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
          if (request.method === "GET") return send(response, 200, current, origin);
          if (request.method === "PATCH") {
            const next = applyKnowledgeUpdate(current, await readBody(request), now());
            // Anything that is, or becomes, public is a publisher's decision.
            if (current.status === "published" || next.status === "published") requirePermission(actor.role, "news:publish");
            await repo.updateKnowledge(next, audit("knowledge.update", next.code));
            await notifySite({});
            return send(response, 200, next, origin);
          }
        }
        return send(response, 404, { error: "NOT_FOUND" }, origin);
      }
      if (url.pathname === "/v1/documents" || url.pathname.startsWith("/v1/documents/")) {
        const actor = await actorFrom(request, now(), repo);
        if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);
        requirePermission(actor.role, "document:register");
        const audit = (action, code) => ({ actorId: actor.id, action, entityType: "document", entityId: code });
        if (request.method === "GET" && url.pathname === "/v1/documents") {
          return send(response, 200, { documents: await repo.listDocuments(), linkCheck: linkCheckState() }, origin);
        }
        if (request.method === "POST" && url.pathname === "/v1/documents") {
          const fields = validateNewDocument(await readBody(request));
          // Going live (anything but a draft) is a publisher's decision, as with news.
          if (fields.status !== "draft") requirePermission(actor.role, "news:publish");
          const record = await repo.createDocument({ ...fields, createdBy: actor.id, updatedAt: now() }, audit("document.create", ""));
          await notifySite({});
          return send(response, 201, record, origin);
        }
        if (request.method === "POST" && url.pathname === "/v1/documents/check-links") {
          requirePermission(actor.role, "news:publish");
          // Many links, ten seconds each at worst: run in the background and answer at once.
          const started = startLinkCheck(repo, { now });
          return send(response, 202, { started, ...linkCheckState() }, origin);
        }
        const one = /^\/v1\/documents\/(RAE-DC-\d{4,})(\/versions)?$/.exec(url.pathname);
        if (one) {
          const current = await repo.getDocument(one[1]);
          if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
          if (request.method === "GET" && one[2]) return send(response, 200, { versions: await repo.listDocumentVersions(one[1]) }, origin);
          if (request.method === "GET") return send(response, 200, current, origin);
          if (request.method === "PATCH" && !one[2]) {
            const input = await readBody(request);
            const { next, newVersion } = applyDocumentUpdate(current, input, now());
            if (next.status !== current.status || next.visibility !== current.visibility) requirePermission(actor.role, "news:publish");
            await repo.updateDocument(
              next,
              newVersion ? { version: next.version, storageUrl: next.storageUrl, changedBy: actor.id, changedAt: now(), changeNote: String(input.changeNote ?? "").slice(0, 500) } : null,
              audit("document.update", next.code),
            );
            await notifySite({});
            return send(response, 200, next, origin);
          }
        }
        return send(response, 404, { error: "NOT_FOUND" }, origin);
      }

      if (request.method === "GET" && url.pathname.startsWith("/v1/media/")) {
        const [, , , mediaArticleId, mediaFile] = url.pathname.split("/");
        const owner = mediaArticleId ? await repo.getArticle(mediaArticleId) : null;
        if (!owner || !mediaFile || !SAFE_MEDIA_FILE.test(mediaFile)) return send(response, 404, { error: "NOT_FOUND" }, origin);
        // A draft's images stay behind authentication; a published article's images are what the
        // preview page and, later, the static import need — including while the row is a revision,
        // because the export still serves the last published version with them.
        // A viewer is logged in but may not see drafts, so the same rule as GET /v1/news applies.
        if (owner.status !== "published" && owner.status !== "revision") {
          const reader = await actorFrom(request, now(), repo);
          if (!reader || !hasPermission(reader.role, "news:draft")) return send(response, 404, { error: "NOT_FOUND" }, origin);
        }
        const files = await repo.listMedia(mediaArticleId);
        const match = files.find((item) => item.filename === mediaFile);
        if (!match) return send(response, 404, { error: "NOT_FOUND" }, origin);
        try {
          const bytes = readFileSync(join(mediaRoot(), mediaArticleId, mediaFile));
          response.writeHead(200, { "content-type": match.mime, "content-length": bytes.length, "cache-control": "private, max-age=60" });
          response.end(bytes);
        } catch {
          send(response, 404, { error: "NOT_FOUND" }, origin);
        }
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/preview/")) {
        const previewId = url.pathname.split("/")[2] ?? "";
        const article = previewId ? await repo.getArticle(previewId) : null;
        if (!article || article.status !== "published") return send(response, 404, { error: "NOT_FOUND" }, origin);
        const mediaList = await repo.listMedia(previewId);
        const html = renderPreview(article, mediaList, url.searchParams.get("lang") ?? "th");
        response.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" });
        response.end(html);
        return;
      }

      const actor = await actorFrom(request, now(), repo);
      if (!actor) return send(response, 401, { error: "UNAUTHORIZED" }, origin);

      if (request.method === "GET" && url.pathname === "/v1/news") {
        const articles = await repo.listArticles();
        // Drafts are the desk's working set. A caller without news:draft — the viewer role is
        // the one that exists for this — gets exactly what the site shows, nothing more.
        const visible = hasPermission(actor.role, "news:draft")
          ? articles
          : articles.filter((article) => article.status === "published");
        return send(response, 200, { articles: visible }, origin);
      }

      if (request.method === "POST" && url.pathname === "/v1/news") {
        requirePermission(actor.role, "news:draft");
        const body = await readBody(request);
        if (!SAFE_ID.test(String(body.id ?? ""))) {
          return send(response, 400, { error: "INVALID_ID", message: "an id is 2-64 characters of a-z, 0-9 and -" }, origin);
        }
        // Creating with an id that already exists would overwrite someone else's article and
        // reset its workflow state; a client that means to change one must PATCH it.
        if (await repo.getArticle(String(body.id))) {
          return send(response, 409, { error: "DUPLICATE_ID", message: "an article with this id already exists" }, origin);
        }
        const article = {
          id: String(body.id),
          status: "draft",
          pinned: Boolean(body.pinned),
          authorId: actor.id,
          titleTh: String(body.titleTh ?? ""),
          titleEn: String(body.titleEn ?? ""),
          source: String(body.source ?? ""),
          bodyTh: toParagraphs(body.bodyTh),
          bodyEn: toParagraphs(body.bodyEn),
        };
        await repo.saveArticleWithAudit(article, { actorId: actor.id, action: "news.draft", entityType: "news", entityId: article.id });
        return send(response, 201, article, origin);
      }

      const id = articleId(url.pathname);
      const current = id ? await repo.getArticle(id) : undefined;

      if (request.method === "PATCH" && url.pathname === `/v1/news/${id}`) {
        requirePermission(actor.role, "news:draft");
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        // A revision is editable for the same reason a draft is: the live version it will replace
        // is held in its snapshot, not in these fields.
        if (current.status !== "draft" && current.status !== "revision") {
          return send(response, 400, { error: "LOCKED" }, origin);
        }
        if (current.authorId !== actor.id) {
          return send(response, 403, { error: "PermissionDenied", message: "only the author can edit this draft" }, origin);
        }
        const body = await readBody(request);
        const next = {
          ...current,
          titleTh: String(body.titleTh ?? current.titleTh),
          titleEn: String(body.titleEn ?? current.titleEn),
          source: String(body.source ?? current.source),
          pinned: body.pinned === undefined ? current.pinned : Boolean(body.pinned),
          bodyTh: body.bodyTh === undefined ? current.bodyTh : toParagraphs(body.bodyTh),
          bodyEn: body.bodyEn === undefined ? current.bodyEn : toParagraphs(body.bodyEn),
        };
        await repo.saveArticleWithAudit(next, { actorId: actor.id, action: "news.edit", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/submit`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const next = submitForReview(current, actor);
        await repo.saveArticleWithAudit(next, { actorId: actor.id, action: "news.submit", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/return`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const body = await readBody(request);
        const next = returnForRevision(current, actor, String(body.reason ?? ""));
        await repo.saveArticleWithAudit(next, { actorId: actor.id, action: "news.return", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/approve`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const next = approveNews(current, actor);
        await repo.saveArticleWithAudit(next, { actorId: actor.id, action: "news.approve", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/publish`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const published = publishNews(current, actor);
        // The live version is frozen here: while a later revision is being edited, the export keeps
        // serving this snapshot, so an unapproved correction cannot reach the site.
        const record = { ...published, publishedSnapshot: publishedSnapshotOf(published) };
        // A republish replaces a story that was already live, which the trail must show as a
        // revision of it; the first release of an item is a plain publish.
        await repo.saveArticleWithAudit(record, {
          actorId: actor.id,
          action: current.revisionNo ? "news.revise" : "news.publish",
          entityType: "news",
          entityId: id,
          before: { status: current.status, revisionNo: current.revisionNo ?? 0 },
          after: { status: record.status, revisionNo: record.revisionNo },
        });
        await notifySite({});
        return send(response, 200, record, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/revise`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const revised = revisePublished(current, actor);
        // Rows published before the snapshot column existed have none; freeze their live body now
        // so the story stays exported for as long as the revision is open.
        const record = { ...revised, publishedSnapshot: revised.publishedSnapshot ?? publishedSnapshotOf(current) };
        await repo.saveArticleWithAudit(record, {
          actorId: actor.id,
          action: "news.revise",
          entityType: "news",
          entityId: id,
          before: { status: current.status, revisionNo: current.revisionNo ?? 0 },
          after: { status: record.status, revisionNo: record.revisionNo ?? 0 },
        });
        return send(response, 200, record, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/unpublish`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const body = await readBody(request);
        const withdrawn = unpublishNews(current, actor, String(body.reason ?? ""));
        await repo.saveArticleWithAudit(withdrawn, {
          actorId: actor.id,
          action: "news.unpublish",
          entityType: "news",
          entityId: id,
          before: { status: current.status },
          after: { status: withdrawn.status, reason: withdrawn.withdrawalReason },
        });
        await notifySite({ withdrawn: [id] });
        return send(response, 200, withdrawn, origin);
      }

      // ---- media: ordered images for one article (author uploads, everyone reads) ----
      if (request.method === "POST" && url.pathname === `/v1/news/${id}/media`) {
        requirePermission(actor.role, "news:draft");
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        if (current.authorId !== actor.id) {
          return send(response, 403, { error: "PermissionDenied", message: "only the author can add images" }, origin);
        }
        if (current.status !== "draft") {
          return send(response, 400, { error: "LOCKED", message: "images are added while the article is a draft" }, origin);
        }
        const body = await readBody(request);
        let bytes;
        try {
          bytes = Buffer.from(String(body.dataBase64 ?? ""), "base64");
        } catch {
          return send(response, 400, { error: "MediaRejected", message: "the payload is not base64" }, origin);
        }
        let mime;
        try {
          mime = assertArticleImage(bytes.subarray(0, 16), bytes.length);
        } catch (error) {
          if (error instanceof MediaRejected) {
            return send(response, 400, { error: "MediaRejected", message: error.message }, origin);
          }
          throw error;
        }
        if (!SAFE_ID.test(id)) return send(response, 400, { error: "INVALID_ID" }, origin);
        const existing = await repo.listMedia(id);
        if (existing.length >= 5) {
          return send(response, 400, { error: "MediaRejected", message: "an article carries at most 5 images" }, origin);
        }
        const position = existing.length + 1;
        const filename = `${String(position).padStart(2, "0")}-${randomUUID().slice(0, 8)}.${extensionFor(mime)}`;
        const directory = join(mediaRoot(), id);
        mkdirSync(directory, { recursive: true });
        writeFileSync(join(directory, filename), bytes);
        const record = {
          id: randomUUID(),
          articleId: id,
          position,
          filename,
          mime,
          bytes: bytes.length,
          captionTh: String(body.captionTh ?? ""),
          captionEn: String(body.captionEn ?? ""),
          altTh: String(body.altTh ?? ""),
          altEn: String(body.altEn ?? ""),
        };
        await repo.saveMedia(record);
        await repo.appendAudit({ actorId: actor.id, action: "news.media", entityType: "news", entityId: id });
        return send(response, 201, record, origin);
      }

      if (request.method === "GET" && url.pathname === `/v1/news/${id}/media`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        if (current.status !== "published" && current.status !== "revision" && !hasPermission(actor.role, "news:draft")) {
          return send(response, 404, { error: "NOT_FOUND" }, origin);
        }
        return send(response, 200, { media: await repo.listMedia(id) }, origin);
      }

      if (request.method === "GET" && url.pathname === "/v1/export") {
        const published = publishedArticlesForExport(await repo.listArticles());
        const withMedia = [];
        for (const article of published) {
          const files = await repo.listMedia(article.id);
          withMedia.push({
            ...article,
            bodyTh: article.bodyTh ?? [],
            bodyEn: article.bodyEn ?? [],
            media: files.map((item) => ({
              url: `/v1/media/${article.id}/${item.filename}`,
              captionTh: item.captionTh,
              captionEn: item.captionEn,
              altTh: item.altTh,
              altEn: item.altEn,
            })),
          });
        }
        return send(response, 200, { articles: withMedia }, origin);
      }

      return send(response, 404, { error: "NOT_FOUND" }, origin);
    } catch (error) {
      const status = error?.status === 413 ? 413 : error?.status === 403 || error?.name === "PermissionDenied" ? 403 : 400;
      send(response, status, { error: error?.name ?? "ERROR", message: error?.message ?? "" }, request.headers.origin);
    }
  });
}

/**
 * Starts the runtime as a service. Requires a database: an operator who forgot the environment
 * must get an error, not a desk that quietly loses every article on restart. Tests call
 * `createCmsServer()` directly, which still defaults to the in-memory repository.
 * Binds to loopback only — the API is internal, never a public route.
 */
export async function startRuntime(env = process.env) {
  if (!env.RAE_CMS_DB_HOST) {
    throw new Error("RAE_CMS_DB_HOST is required to run the CMS runtime; the in-memory repository is for tests only");
  }
  const repository = await repositoryFromEnv(env);
  const port = Number(env.RAE_CMS_API_PORT ?? 3317);
  // Loopback by default. Inside a container the listener has to cover the container's own
  // interface, because a published port is forwarded to that address — the port is still
  // published on 127.0.0.1 only, so nothing is reachable from outside the host.
  const bind = env.RAE_CMS_API_BIND ?? "127.0.0.1";
  const sso = await createSso({ repository, env });
  const contact = readContactConfig(env, (path) => readFileSync(path, "utf8"));
  const server = createCmsServer({ repository, sso, contact, analytics: readAnalyticsConfig(env) });
  // Daily link health (RAE_DOC_LINK_CHECK_HOURS, 0 turns it off); the first pass waits five minutes
  // so a restart storm does not become a request storm.
  const hours = Number(env.RAE_DOC_LINK_CHECK_HOURS ?? 24);
  if (hours > 0) {
    const run = () => startLinkCheck(repository);
    setTimeout(run, 5 * 60 * 1000).unref();
    setInterval(run, hours * 3600 * 1000).unref();
  }
  await new Promise((resolve) => server.listen(port, bind, resolve));
  return { server, repository, port, bind };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const { port, bind } = await startRuntime();
  console.log(`cms-runtime listening on http://${bind}:${port} (mysql)`);
}

export { submitForReview, approveNews, returnForRevision };
