// MJU SSO for the CMS desk — built on the MJU SSO standard adapter (numtip/mju-sso-integration).
//
// The standard lives in a PRIVATE repository and this repository is public, so its source is NOT
// copied here. The adapter is resolved at start-up from MJU_SSO_MODULE (a path to its src/index.js)
// or from the installed package `@mju/sso-integration` (see docs/ops/mju-sso-install.md). If SSO is
// enabled and the adapter cannot be loaded the runtime refuses to start; if SSO is not enabled
// nothing is loaded and there is no SSO surface.
//
// What this file adds, and what it deliberately does not:
//  * SSO only proves WHO signed in. Roles stay on `users.role`; no role is ever derived from SSO.
//  * A sign-in needs an APPROVED link (HMAC of the subject -> an existing local user). An unknown
//    subject is recorded as `pending` and refused. A person with `user:assign_role` approves it.
//  * The callback never puts a token in a URL: it stores a 60 s single-use handoff and the desk
//    exchanges it once. The exchange mints a fresh session token and revokes any presented one.
//  * Disabled by default. With MJU_SSO_ENABLED unset/false every SSO route answers 404 and the
//    local login is unchanged. Local login is never removed by this module.
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { hashSessionToken, openSession } from "../lib/cms/session.ts";
import { clientKey, createIpLimiter } from "../lib/cms/ip-rate-limit.ts";

const HANDOFF_COOKIE = "rae_sso_handoff";
const HANDOFF_TTL_MS = 60_000;
const DESK_PATH = "/th/cms-admin/";

const parseCookies = (header = "") => {
  const out = {};
  for (const part of String(header).split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignore a malformed cookie */
    }
  }
  return out;
};

export function serializeCookie({ name, value, path = "/", secure = true, httpOnly = true, sameSite = "Lax", maxAge, domain }) {
  if (domain !== undefined) throw new Error("cookies are host-only");
  const parts = [`${name}=${encodeURIComponent(value ?? "")}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

const csrfFor = (token) => createHash("sha256").update(`rae-sso-csrf:${token}`).digest("hex");

/**
 * @returns {null | { enabled: true, handle(request, response, url, ctx): Promise<boolean> }}
 * `null` means SSO is off; the caller must then answer nothing SSO-specific.
 */
export async function createSso({ repository, env = process.env, now = () => Date.now(), importAdapter, adapterDeps = {} } = {}) {
  const flag = String(env.MJU_SSO_ENABLED ?? "").toLowerCase();
  if (flag !== "true" && flag !== "1") return null;
  for (const method of ["findSsoLink", "requestSsoLink", "consumeSsoHandoff"]) {
    if (typeof repository?.[method] !== "function") throw new Error(`MJU_SSO_ENABLED but the repository lacks ${method} (apply migration 008)`);
  }
  const lib = importAdapter ? await importAdapter() : await import(env.MJU_SSO_MODULE || "@mju/sso-integration");
  const { loadConfig, createMjuSsoAdapter, parseCallbackQuery, toPublicError, ATTEMPT_COOKIE } = lib;
  const { adapter: config } = loadConfig(env);
  // The single-use login attempts (and so replay denial) survive a restart when a durable driver is
  // configured: MJU_SSO_STORE_DRIVER=file + MJU_SSO_STORE_FILE_ROOT, with MJU_SSO_STORE_REQUIRE_DURABLE=true
  // making a memory fallback a start-up error. Sessions here are CMS bearer sessions in MySQL, not this store.
  const stores = await lib.createStoresFromConfig(env);

  // A per-request holder: the resolver stays a pure read and only remembers which subject it saw,
  // so an unknown one can be recorded as `pending` afterwards. It never carries the raw identifier.
  const context = new AsyncLocalStorage();

  const sso = createMjuSsoAdapter({
    config: { ...config, postLoginRedirect: DESK_PATH },
    deps: {
      attemptStore: stores.attempts,
      ...adapterDeps,
      identityResolver: async ({ subject, subjectClaim, subjectIsConfidential }) => {
        // A confidential claim already arrives as the application-scoped HMAC. A non-confidential
        // one (humanID/personID) is still never stored raw: it is hashed to the same 64-hex shape.
        const key = subjectIsConfidential
          ? subject
          : (config.hmacKey ? createHmac("sha256", config.hmacKey) : createHash("sha256"))
              .update(`rae-cms\0${subjectClaim}\0${subject}`)
              .digest("hex");
        const holder = context.getStore();
        if (holder) holder.subjectKey = key;
        const link = await repository.findSsoLink(key);
        if (!link) return { status: "unknown" };
        if (link.status !== "approved") return { status: link.status };
        const user = link.userId ? await repository.findUser(link.userId) : null;
        return user ? { status: "approved", localUserId: user.id } : { status: "disabled" };
      },
      sessionManager: {
        // Not a session yet: a single-use handoff code. The desk exchanges it for a fresh bearer.
        issue: async ({ localUserId }) => {
          const code = randomBytes(32).toString("base64url");
          await repository.saveSsoHandoff(hashSessionToken(code), localUserId, now() + HANDOFF_TTL_MS);
          return { sessionId: code };
        },
        revoke: async () => {},
      },
      logger: (record) => process.stdout.write(`${JSON.stringify({ level: "info", sso: true, ...record })}\n`),
    },
  });

  const securityHeaders = { "cache-control": "no-store, private", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" };
  const redirect = (response, status, location, cookies = []) => {
    response.writeHead(status, { ...securityHeaders, location, "set-cookie": cookies.map(serializeCookie) });
    response.end();
  };
  const json = (response, status, body, cookies = []) => {
    response.writeHead(status, { ...securityHeaders, "content-type": "application/json; charset=utf-8", "set-cookie": cookies.map(serializeCookie) });
    response.end(JSON.stringify(body));
  };

  // Per-client budgets (see lib/cms/ip-rate-limit.ts). Separate buckets so a login flood cannot
  // consume the callback or exchange budget of someone mid sign-in.
  const buckets = {
    login: createIpLimiter({ max: 20, windowMs: 60_000 }),
    callback: createIpLimiter({ max: 20, windowMs: 60_000 }),
    exchange: createIpLimiter({ max: 30, windowMs: 60_000 }),
  };
  const limited = (request, bucket) => {
    const result = buckets[bucket].hit(clientKey(request.headers, request.socket?.remoteAddress), now());
    return result.limited ? result : null;
  };
  const tooMany = (response, result) =>
    (response.setHeader("retry-after", String(result.retryAfterSeconds)), json(response, 429, { error: "TOO_MANY_REQUESTS" }));

  return {
    enabled: true,
    /** Returns true when the request was an SSO route and has been answered. */
    async handle(request, response, url, { actor, readBody, send, requirePermission, audit }) {
      const path = url.pathname;
      const origin = request.headers.origin;
      if (path === "/v1/sso/status" && request.method === "GET") {
        send(response, 200, { enabled: true, loginPath: "/cms-api/v1/sso/login" }, origin);
        return true;
      }
      if (path === "/v1/sso/login" && request.method === "GET") {
        const over = limited(request, "login");
        if (over) return tooMany(response, over), true;
        try {
          const result = await sso.beginLogin({ correlationId: randomBytes(8).toString("hex") });
          redirect(response, 302, result.redirectTo, result.cookies);
        } catch (error) {
          json(response, toPublicError(error).status ?? 503, { error: toPublicError(error).code });
        }
        return true;
      }
      if (path === "/v1/sso/callback") {
        const over = limited(request, "callback");
        if (over) return tooMany(response, over), true;
        const holder = {};
        try {
          const result = await context.run(holder, () => sso.handleCallback({
            method: request.method,
            query: parseCallbackQuery(url.searchParams),
            cookies: parseCookies(request.headers.cookie),
            // The callback is a top-level navigation with no bearer: genuinely anonymous.
            previousSessionId: null,
            correlationId: randomBytes(8).toString("hex"),
          }));
          const handoff = serializeCookieSpec(HANDOFF_COOKIE, result.session.sessionId, "/", HANDOFF_TTL_MS / 1000);
          redirect(response, 303, `${DESK_PATH}?sso=1`, [...result.cookies, handoff]);
        } catch (error) {
          const pub = toPublicError(error);
          // An unknown subject becomes a pending request an administrator can approve; it signs nobody in.
          if (pub.code === "SSO_IDENTITY_UNLINKED" && holder.subjectKey) {
            await repository.requestSsoLink(holder.subjectKey, now()).catch(() => {});
          }
          const code = encodeURIComponent(pub.code ?? "SSO_ERROR");
          redirect(response, 303, `${DESK_PATH}?sso_error=${code}`, [
            { name: ATTEMPT_COOKIE, value: "", httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: 0 },
          ]);
        }
        return true;
      }
      if (path === "/v1/sso/exchange" && request.method === "POST") {
        const over = limited(request, "exchange");
        if (over) return tooMany(response, over), true;
        const cookies = parseCookies(request.headers.cookie);
        const code = cookies[HANDOFF_COOKIE];
        const clear = [{ name: HANDOFF_COOKIE, value: "", path: "/", maxAge: 0 }];
        const userId = code ? await repository.consumeSsoHandoff(hashSessionToken(code), now()) : null;
        const user = userId ? await repository.findUser(userId) : null;
        if (!user) return json(response, 401, { error: "UNAUTHORIZED" }, clear), true;
        // Rotation: a bearer presented here is revoked; the caller always gets a brand-new token.
        const header = request.headers.authorization ?? "";
        if (header.startsWith("Bearer ")) await repository.deleteSession(hashSessionToken(header.slice(7)));
        const token = randomBytes(32).toString("base64url");
        await repository.saveSession(hashSessionToken(token), openSession(user.id, now()));
        await audit({ actorId: user.id, action: "sso.login", entityType: "user", entityId: user.id });
        json(response, 200, { token, csrf: csrfFor(token) }, clear);
        return true;
      }
      if (path === "/v1/sso/logout") {
        if (request.method !== "POST") {
          response.writeHead(405, { allow: "POST" });
          response.end();
          return true;
        }
        const header = request.headers.authorization ?? "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        const body = await readBody(request);
        try {
          const result = await sso.logout({
            method: "POST",
            csrfToken: String(body.csrf ?? ""),
            expectedCsrfToken: token ? csrfFor(token) : "x",
            session: token ? { sessionId: token } : null,
            correlationId: randomBytes(8).toString("hex"),
          });
          await repository.deleteSession(hashSessionToken(token));
          send(response, 200, { signoutUrl: result.redirectTo }, origin);
        } catch (error) {
          const pub = toPublicError(error);
          send(response, pub.status ?? 400, { error: pub.code }, origin);
        }
        return true;
      }
      if (path.startsWith("/v1/sso/links")) {
        const user = await actor();
        if (!user) return send(response, 401, { error: "UNAUTHORIZED" }, origin), true;
        requirePermission(user.role, "user:assign_role");
        if (request.method === "GET" && path === "/v1/sso/links") {
          const links = await repository.listSsoLinks();
          // The subject key is an HMAC, not an identifier; only a short reference is shown.
          send(response, 200, { links: links.map((l) => ({ id: l.id, ref: l.subjectKey.slice(0, 8), status: l.status, userId: l.userId, requestedAt: l.requestedAt, approvedBy: l.approvedBy })) }, origin);
          return true;
        }
        const match = /^\/v1\/sso\/links\/([0-9a-f-]{36})\/(approve|revoke)$/.exec(path);
        if (request.method === "POST" && match) {
          const body = await readBody(request);
          const t = now();
          let ok;
          if (match[2] === "approve") {
            const target = await repository.findUser(String(body.userId ?? ""));
            if (!target) return send(response, 404, { error: "USER_NOT_FOUND" }, origin), true;
            ok = await repository.approveSsoLink(match[1], target.id, user.id, t);
          } else {
            ok = await repository.revokeSsoLink(match[1], user.id, t);
          }
          if (!ok) return send(response, 409, { error: "NOT_APPLICABLE" }, origin), true;
          await audit({ actorId: user.id, action: `sso.link.${match[2]}`, entityType: "sso_link", entityId: match[1] });
          send(response, 200, { ok: true }, origin);
          return true;
        }
        send(response, 404, { error: "NOT_FOUND" }, origin);
        return true;
      }
      return false;
    },
  };
}

function serializeCookieSpec(name, value, path, maxAge) {
  return { name, value, path, maxAge, httpOnly: true, secure: true, sameSite: "Lax" };
}
