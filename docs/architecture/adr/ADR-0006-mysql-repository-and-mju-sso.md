# ADR-0006 — MySQL repository (no ORM) and MJU SSO on top of application RBAC

- **Status:** Accepted (owner decisions, 2026-11-25)
- **Amends:** ADR-0001 (persistence: Prisma is dropped), ADR-0003 (identity: MJU SSO is adopted)
- **Supersedes in the docs:** the Prisma wording in `DATABASE_AND_API_BLUEPRINT.md`, `RAE_PLATFORM_ARCHITECTURE.md` (C3) and `MODULE_REQUIREMENTS_MATRIX.md` (X-01)

## Decision 1 — Keep the hand-written MySQL repository; no Prisma

Persistence goes through `lib/cms/mysql-repository.ts` (mysql2, parameterised queries only), behind the
`Repository` type that the in-memory test repository also implements. DDL is versioned SQL in
`cms-runtime/migrations/NNN_*.sql`, applied by hand with a backup first. Prisma was removed from the tree
in #102 and is not coming back.

Why: the runtime is already live on it (migrations 001–008, real-database tests, transactional
article+audit writes verified); a second data layer would add a migration path and a build step for no
requirement the repository does not meet. SQL-injection defence is parameterised queries plus the
repository boundary — `X-01` is met by that, not by an ORM.

Cost accepted: no generated types, migrations are not auto-diffed. Revisit if the module count grows
past what one reviewer can hold in their head.

## Decision 2 — Adopt MJU SSO for authentication; authorisation stays in the application

- MJU SSO proves **who** signed in. It never grants a role.
- Roles are `users.role` (viewer / officer / editor / publisher / admin), exactly as before.
- A sign-in needs an **approved identity link**: an application-scoped HMAC of the provider subject bound
  to an existing local user. An unknown subject is stored as `pending` and refused. An administrator
  (`user:assign_role`) approves or revokes. Nothing auto-links; no e-mail or name matching.
- The callback never carries a token in a URL: it stores a 60 s single-use handoff; the desk exchanges it
  once for a fresh bearer token, and any presented bearer is revoked (session rotation).
- Logout is `POST` + CSRF, revokes the server session, then goes to the provider sign-out.
- **Local login is retained** as the emergency path and is not touched by SSO being on or off.
- The integration uses the shared standard `numtip/mju-sso-integration` (adapter `1.0.0-rc.6`). That
  repository is private and this one is public, so the adapter is installed beside the runtime, never
  copied into this repository (`docs/ops/mju-sso.md`).
- SSO is **disabled** (`MJU_SSO_ENABLED` unset). Enabling needs the owner gates in `docs/ops/mju-sso.md`;
  the provider contract is still `UNKNOWN` and `providerCertified` is `false`.
- Agent Core is advisory only and is never in the authentication path.

## Consequences

- One more table pair (`sso_identity_links`, `sso_handoffs`), additive, safe with SSO off.
- CI cannot run the SSO tests (private adapter); they run locally with `MJU_SSO_MODULE=…` and skip in CI.
  Giving CI a read token for the private repo is an owner decision.
