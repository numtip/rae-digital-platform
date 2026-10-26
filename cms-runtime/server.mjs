import { createServer } from "node:http";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertArticleImage, extensionFor, MediaRejected } from "../lib/cms/media.ts";
import { submitForReview, approveNews, publishNews, returnForRevision } from "../lib/cms/news-workflow.ts";
import { publishedArticlesForExport } from "../lib/cms/publish.ts";
import { requirePermission } from "../lib/cms/permissions.ts";
import { hashSessionToken, isSessionExpired, openSession } from "../lib/cms/session.ts";
import { FAILURE_WINDOW_MS, createLoginThrottle } from "../lib/cms/login-throttle.ts";
import { createMysqlRepository } from "../lib/cms/mysql-repository.ts";

// The runtime keeps no state of its own any more: every record goes through a Repository.
// Memory is the default so the desk runs without a database; the isolated rae_cms database
// is used as soon as RAE_CMS_DB_HOST is configured (see repositoryFromEnv).

const users = new Map();
const sessions = new Map();
const articles = new Map();
const audit = [];
const media = new Map();
const throttle = createLoginThrottle();

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function resetRuntime() {
  users.clear();
  throttle.reset();
  sessions.clear();
  articles.clear();
  media.clear();
  audit.length = 0;
}

export function addUser({ id, role, password }) {
  users.set(id, { id, role, passwordHash: hashPassword(password) });
}

export async function addUserToRepository(repository, { id, role, password }) {
  await repository.addUser({ id, role, passwordHash: hashPassword(password) });
}

/** The shape `createCmsServer` needs, backed by the module maps. */
function memoryRepository() {
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
    async listAudit() {
      return [...audit];
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

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
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
  return pathname.split("/")[3] ?? "";
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
  const body = article.body ?? [];
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

export function createCmsServer({ now = () => Date.now(), repository = memoryRepository() } = {}) {
  const repo = repository;
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const origin = request.headers.origin;
      if (request.method === "OPTIONS") {
        const headers = { "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "access-control-allow-headers": "content-type, authorization" };
        if (origin && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) headers["access-control-allow-origin"] = origin;
        response.writeHead(204, headers);
        response.end();
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/login") {
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

      if (request.method === "GET" && url.pathname.startsWith("/v1/media/")) {
        const [, , , mediaArticleId, mediaFile] = url.pathname.split("/");
        const owner = mediaArticleId ? await repo.getArticle(mediaArticleId) : null;
        if (!owner || !mediaFile || mediaFile.includes("..")) return send(response, 404, { error: "NOT_FOUND" }, origin);
        // A draft's images stay behind authentication; a published article's images are what the
        // preview page and, later, the static import need.
        if (owner.status !== "published" && !(await actorFrom(request, now(), repo))) {
          return send(response, 404, { error: "NOT_FOUND" }, origin);
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
        return send(response, 200, { articles: await repo.listArticles() }, origin);
      }

      if (request.method === "POST" && url.pathname === "/v1/news") {
        requirePermission(actor.role, "news:draft");
        const body = await readBody(request);
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
        };
        await repo.saveArticle(article);
        await repo.appendAudit({ actorId: actor.id, action: "news.draft", entityType: "news", entityId: article.id });
        return send(response, 201, article, origin);
      }

      const id = articleId(url.pathname);
      const current = id ? await repo.getArticle(id) : undefined;

      if (request.method === "PATCH" && url.pathname === `/v1/news/${id}`) {
        requirePermission(actor.role, "news:draft");
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        if (current.status !== "draft") return send(response, 400, { error: "LOCKED" }, origin);
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
        };
        await repo.saveArticle(next);
        await repo.appendAudit({ actorId: actor.id, action: "news.edit", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/submit`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const next = submitForReview(current, actor);
        await repo.saveArticle(next);
        await repo.appendAudit({ actorId: actor.id, action: "news.submit", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/return`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const body = await readBody(request);
        const next = returnForRevision(current, actor, String(body.reason ?? ""));
        await repo.saveArticle(next);
        await repo.appendAudit({ actorId: actor.id, action: "news.return", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/approve`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const next = approveNews(current, actor);
        await repo.saveArticle(next);
        await repo.appendAudit({ actorId: actor.id, action: "news.approve", entityType: "news", entityId: id });
        return send(response, 200, next, origin);
      }

      if (request.method === "POST" && url.pathname === `/v1/news/${id}/publish`) {
        if (!current) return send(response, 404, { error: "NOT_FOUND" }, origin);
        const published = publishNews(current, actor);
        await repo.saveArticle(published);
        await repo.appendAudit({ actorId: actor.id, action: "news.publish", entityType: "news", entityId: id });
        return send(response, 200, published, origin);
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
        const existing = await repo.listMedia(id);
        if (existing.length >= 10) {
          return send(response, 400, { error: "MediaRejected", message: "an article carries at most 10 images" }, origin);
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
        return send(response, 200, { media: await repo.listMedia(id) }, origin);
      }

      if (request.method === "GET" && url.pathname === "/v1/export") {
        const published = publishedArticlesForExport(await repo.listArticles());
        const withMedia = [];
        for (const article of published) {
          const files = await repo.listMedia(article.id);
          withMedia.push({
            ...article,
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
      const status = error?.status === 403 || error?.name === "PermissionDenied" ? 403 : 400;
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
  const server = createCmsServer({ repository });
  await new Promise((resolve) => server.listen(port, bind, resolve));
  return { server, repository, port, bind };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const { port, bind } = await startRuntime();
  console.log(`cms-runtime listening on http://${bind}:${port} (mysql)`);
}

export { submitForReview, approveNews, returnForRevision };
