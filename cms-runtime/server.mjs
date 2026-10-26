import { createServer } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

      if (request.method === "GET" && url.pathname === "/v1/export") {
        return send(response, 200, { articles: publishedArticlesForExport(await repo.listArticles()) }, origin);
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
  const server = createCmsServer({ repository });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { server, repository, port };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const { port } = await startRuntime();
  console.log(`cms-runtime listening on http://127.0.0.1:${port} (mysql)`);
}

export { submitForReview, approveNews, returnForRevision };
