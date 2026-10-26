import { createServer } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { submitForReview, approveNews, publishNews } from "../lib/cms/news-workflow.ts";
import { publishedArticlesForExport } from "../lib/cms/publish.ts";
import { hashSessionToken } from "../lib/cms/session.ts";

const users = new Map();
const sessions = new Map();
const articles = new Map();
const audit = [];

export function resetRuntime() {
  users.clear();
  sessions.clear();
  articles.clear();
  audit.length = 0;
}

export function addUser({ id, role, password }) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  users.set(id, { id, role, passwordHash: `${salt}:${hash}` });
}

function passwordMatches(user, password) {
  const [salt, hash] = user.passwordHash.split(":");
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function actorFrom(request) {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const session = sessions.get(hashSessionToken(token));
  if (!session) return null;
  return users.get(session.userId) ?? null;
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

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export function createCmsServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "POST" && url.pathname === "/v1/login") {
        const body = await readBody(request);
        const user = users.get(body.userId);
        if (!user || !passwordMatches(user, String(body.password ?? ""))) {
          return send(response, 401, { error: "UNAUTHORIZED" });
        }
        const token = randomBytes(32).toString("base64url");
        sessions.set(hashSessionToken(token), { userId: user.id });
        return send(response, 200, { token });
      }

      const actor = actorFrom(request);
      if (!actor) return send(response, 401, { error: "UNAUTHORIZED" });

      if (request.method === "POST" && url.pathname === "/v1/news") {
        const body = await readBody(request);
        const article = {
          id: String(body.id),
          status: "draft",
          pinned: Boolean(body.pinned),
          authorId: actor.id,
          titleTh: String(body.titleTh ?? ""),
          titleEn: String(body.titleEn ?? ""),
          source: String(body.source ?? ""),
        };
        articles.set(article.id, article);
        audit.push({ actorId: actor.id, action: "news.draft", entityId: article.id });
        return send(response, 201, { id: article.id, status: "draft" });
      }

      if (request.method === "POST" && url.pathname.startsWith("/v1/news/") && url.pathname.endsWith("/publish")) {
        const id = url.pathname.split("/")[3];
        const current = articles.get(id);
        if (!current) return send(response, 404, { error: "NOT_FOUND" });
        const published = publishNews(current, actor);
        articles.set(id, published);
        audit.push({ actorId: actor.id, action: "news.publish", entityId: id });
        return send(response, 200, { id, status: published.status });
      }

      if (request.method === "GET" && url.pathname === "/v1/export") {
        return send(response, 200, { articles: publishedArticlesForExport([...articles.values()]) });
      }

      return send(response, 404, { error: "NOT_FOUND" });
    } catch (error) {
      const status = error?.status === 403 || error?.name === "PermissionDenied" ? 403 : 400;
      send(response, status, { error: error?.name ?? "ERROR" });
    }
  });
}

export { submitForReview, approveNews };
