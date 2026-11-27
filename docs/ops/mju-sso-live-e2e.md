# MJU SSO — production state and live E2E (prepared 2026-11-25; live pilot 2026-11-27)

## Deployed state (SSO OFF)

| Item | State |
|---|---|
| Registered client | dedicated client, id in `runtime.env` as `MJU_CLIENT_ID` (a registration identifier, not a secret) |
| Callback / host | `https://rae-cms.raemanagemju.net/cms-api/v1/sso/callback` |
| Code on `main` | CMS runtime and Next site refreshed to the merge of #108 |
| DB | migration 008 applied to `rae_cms` (tables `sso_identity_links`, `sso_handoffs`); backup taken first |
| Flags | `MJU_SSO_ENABLED=false`; every `/v1/sso/*` answers `404` |
| Adapter | `v1.0.0-rc.6` at `~/rae/rae-cms-runtime/sso-adapter`, mounted read-only, never in git |
| Local login | unchanged and independent of SSO |

## Public routing (owner / Cloudflare dashboard — the Tunnel is remote-managed)

1. On the existing tunnel add ONE public hostname: `rae-cms.raemanagemju.net` → `http://127.0.0.1:3417`. Touch no other hostname.
2. Cloudflare Access: protect `/th/cms-admin/*` and `/en/cms-admin/*`. Do **not** put Access in front of
   `/cms-api/v1/sso/login` and `/cms-api/v1/sso/callback`: MJU's redirect carries no Access cookie and would be bounced.
   Those two routes are protected by the adapter (attempt cookie, single-use code, rate limit, approved link).
3. Block `/cms-api/v1/news*`, `/cms-api/v1/media*` etc. from the public if the desk is Access-only; or leave them — they already require a bearer token.
4. Verify from outside: `GET /th/` 200 over valid TLS; `GET /cms-api/v1/sso/callback` (SSO off) 404; `POST` to it 404.

## Enablement gates (an agent must not perform the live sign-in itself)

Per the standard (`AGENTS.md` rule 3) a live authentication needs written authorisation. Open items:
- A written test authorisation for **this** client and a new window (the 2026-11-06 window for the other client has expired).
- Subject claim choice: `citizenID` (C-14 `VERIFIED`, purpose-limited) with `MJU_SSO_LAWFUL_BASIS_APPROVED=true`, or `humanID`.
- Production risk acceptance covering this consumer: `MJU_SSO_OWNER_RISK_ACCEPTANCE=<path to compliance/production-risk-acceptance.v1.json>` (the 2026-11-13 acceptance names the RAE Research Office as the single consumer — confirm it applies to the CMS).
- One consenting test account whose local user already exists.

## Procedure once the gates are met

1. `runtime.env`: set the chosen gates, `MJU_SSO_ENABLED=true`; `systemctl --user restart rae-cms-runtime`. Expect `GET /cms-api/v1/sso/status` → `{"enabled":true}`; the desk shows the SSO button.
2. Test user opens `/th/cms-admin/` → **MJU SSO**. First attempt ends at `sso_error` and creates a `pending` link (`GET /v1/sso/links` as admin shows an 8-char ref).
3. Admin approves: `POST /cms-api/v1/sso/links/<id>/approve {"userId":"<existing cms user>"}` (audit row `sso.link.approve`).
4. Second attempt signs in; role is the local role. Check: cannot approve links unless admin; session cookie absent (bearer only); the old bearer is dead after exchange.
5. Sign out: provider sign-out reached, `GET /v1/news` with the old token → 401.
6. Negative checks: replay the same `ac` (refused), open the callback without starting a login (refused), revoke the link and retry (refused), local password login still works.

## Rollback

`MJU_SSO_ENABLED=false` + restart (SSO vanishes, local login unaffected). Code rollback: previous SHAs and unit files are in
`~/rae/rae-cms-backups/pre-sso-*/` (`runtime-prev-sha`, `site-prev-sha`, unit copies, `runtime.env.bak`). The DB backup
there restores `rae_cms`; migration 008 is additive and can stay.

---

## Live pilot — 2026-11-27 (SSO ON for the CMS, supersedes "Deployed state (SSO OFF)" above)

**Result:** one staff account signed in through the real MJU SSO twice (with a sign-out between), landing on the
desk with the existing local `admin` role. The account was linked by the approved-link flow, not by e-mail.

| Item | State |
|---|---|
| Adapter | `@mju/sso-integration` **v1.0.0-rc.6**, commit `2d30b3500fcb` (= tag `v1.0.0-rc.6`; the same version Attendance V2 integrated in its PR #86), at `~/rae/rae-cms-runtime/sso-adapter`, mounted read-only at `/opt/mju-sso` |
| Registration | client `RAE CMS`, callback `https://rae-cms.raemanagemju.net/cms-api/v1/sso/callback`, after-signout `https://rae-cms.raemanagemju.net/th/cms-admin/`; the client id equals `MJU_CLIENT_ID` (owner-reported registration; not checkable from this host) |
| Subject | `citizenID` (C-08 `VERIFIED`) → application-scoped HMAC; `MJU_SSO_LAWFUL_BASIS_APPROVED=true` against a **new CMS-purpose C-14 record** (the 2026-11-06 record covers attendance only; C14 record §7) |
| Unverified contract | `MJU_SSO_ALLOW_UNVERIFIED_CONTRACT=true` with `MJU_SSO_OWNER_RISK_ACCEPTANCE=/opt/mju-sso/risk-acceptance.json` (ADR-006); `providerCertified` stays `false` |
| Evidence (outside git) | the signed C-14 + D-5 form, its sha256 in `~/rae/rae-cms-secrets/c14-cms-countersign.sha256`; the signer is the owner, so the D-5 record has **no MJU-side co-signer** (owner decision 2026-11-27) |
| Activation | `~/rae/ops/mju-sso-activate.sh <signed form>` (owner-run): refuses an unsigned form, an objection or a claim other than `citizenID`; sets the four flags, restarts, probes, and reverts itself on failure |

### The CMS container DNS problem (the one real defect found)

The first live attempts ended `SSO_PROVIDER_ERROR`. From the host `sso.mju.ac.th` resolves to the internal address
`10.1.254.54` and answers; inside the runtime container (Docker DNS) it resolved to the public address, which this
host cannot reach, so the token exchange timed out. The browser leg worked (MJU redirected back), only the server-side
exchange failed. Fix: `--add-host sso.mju.ac.th:10.1.254.54` on the `docker run` line of
`~/.config/systemd/user/rae-cms-runtime.service`, so it survives restarts. TLS stays on and verified
(`rejectUnauthorized: true`, certificate `*.mju.ac.th`, valid to 2027-01-02); no `NODE_TLS_REJECT_UNAUTHORIZED`, no
`MJU_SSO_CA_BUNDLE`. If MJU renumbers that host, this one line is what to change. Cloudflare is not involved: it only
carries inbound traffic (the browser and the callback), never this outbound call.

### Results

| Check | Result |
|---|---|
| Unlinked identity | refused `SSO_IDENTITY_UNLINKED`, one `pending` link recorded (subject key only) |
| Approved link, sign-in ×2, sign-out between | success; audit rows `sso.link.approve`, `sso.login` |
| Role | the local role (`admin`); SSO grants none |
| Raw `citizenID` | not in the link table (`subject_key` is 64 hex), the runtime log, or the state directory (13-digit matches there are epoch-ms expiry stamps) |
| Callback without a started login | `SSO_ATTEMPT_MISSING`; `no-store`, `nosniff`, `no-referrer` on SSO responses; attempt cookie `HttpOnly; Secure; SameSite=Lax` |
| Local login | unchanged, works |
| Replay, revocation, old token after logout, CSRF, RBAC, C-14 flag off, no acceptance | **not exercised on production** (a revoked link cannot be re-approved here, so that test would lock the pilot account out). Pinned in an isolated run instead: `tests/cms-sso.test.mjs` (7 tests, in-memory repository, fake provider, `MJU_SSO_MODULE` set to the pinned adapter; they skip in public CI because the adapter is private). Two of them run the production configuration (`citizenID`, C-14 flag, acceptance, `NODE_ENV=production`) |

### Rollback

`MJU_SSO_ENABLED=false` in `~/rae/rae-cms-secrets/runtime.env`, then `systemctl --user restart rae-cms-runtime`: every
`/v1/sso/*` answers 404 and the SSO button disappears; local login is unaffected. The activation script keeps the
previous env and the signed form under `~/rae/rae-cms-backups/pre-sso-activate-*/`. Migration 008 is additive and stays.
