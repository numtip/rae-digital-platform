# MJU SSO — production state and live E2E preparation (2026-11-25)

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
