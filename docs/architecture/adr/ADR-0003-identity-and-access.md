# ADR-0003 — Identity, sessions and authorisation

- **Status:** Proposed (gate A-3 unresolved)
- **Date:** 2026-10-24
- **Context doc:** `../RAE_PLATFORM_ARCHITECTURE.md §10`

## Context

Neither existing repository contains any authentication, session, RBAC or SSO code.
The platform handles personnel records and administrative approvals, so identity is the
highest-risk area. MJU operates Microsoft-based identity; the documented protocol available
to applications is Entra ID OIDC. An undocumented legacy SSO callback (`ac`) exists and must
not be reverse-engineered.

## Decision

1. **Primary auth:** Entra ID OIDC, authorisation-code flow with PKCE, scopes `openid profile email`.
2. **Fallback auth:** local accounts with Argon2id (min 12 chars, breach-list check) for people
   outside SSO (retirees, external approvers) — enabled per account, not per site.
3. **Sessions:** opaque random token stored hashed in the `sessions` table, not a stateless JWT.
   8 h idle / 12 h absolute; rotated on login; revoked on role change and password reset.
   Cookie `__Host-rae_admin`, `Secure`, `HttpOnly`, `SameSite=Lax`.
4. **Authorisation:** permission strings `resource:action` assigned to roles, optionally scoped to a
   department. Enforced at four points — edge middleware, server action, repository scope, DB grant.
   Never `if (role === 'admin')`.
5. **MFA:** TOTP mandatory for `super_admin`, `admin`, `director`, `manager`.

## Rationale

- SSO-only would lock out people who legitimately need approval access without an MJU account.
- Opaque sessions are revocable immediately; role changes must take effect at once.
- Four-layer enforcement means one forgotten check does not become an exposure.

## Consequences

- Two auth paths to test and monitor; the local path is the one that needs the most rate limiting.
- Role mapping is data (`role_permissions`), so new departments do not need code changes.
- **Do not implement the unknown `ac` callback.** If MJU cannot provide an OIDC contract,
  the platform runs local-only and SSO stays a Phase 2+ item (gate A-3).

## Machine access

Partner integrations use a **JWT access token (15 min) + revocable refresh token**, not the
session cookie. Both are audited; scopes are checked server-side on every call.
