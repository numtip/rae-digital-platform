# MJU SSO — registration, install, enablement

State: **built, deployed disabled.** Nothing here has been exercised against `sso.mju.ac.th`.

## 1. Registration parameters (owner submits to MJU)

| Field | Value |
|---|---|
| Client name | `RAE CMS (rae-digital-platform)` — a **dedicated** client; do not reuse the Attendance V2 or `RAE SSO Integration` client |
| Callback (webhook) URL | `https://<RAE_CMS_HOST>/cms-api/v1/sso/callback` |
| After sign-out URL | `https://<RAE_CMS_HOST>/th/cms-admin/` |
| Methods | callback `GET` only (`?ac=`), token exchange server-side `POST token.aspx {clientID, code}`; no client secret |
| Claim used | `humanID` first; `citizenID` only after the lawful-basis gate (C-14) is closed by the owner |
| Environment | production, one client id |

`<RAE_CMS_HOST>` is the one hostname that serves the Next container (`127.0.0.1:3417`). Recommended:
`rae-cms.raemanagemju.net` through the existing Cloudflare Tunnel (the pattern the registered
`sso.raemanagemju.net` already uses; no host nginx or DNS change). Alternative: an `mju.ac.th` hostname,
which needs MJU DNS and the nginx server block in `deploy/production/`. The exact string is therefore:

`https://rae-cms.raemanagemju.net/cms-api/v1/sso/callback`

If the owner picks another host, only `<RAE_CMS_HOST>` changes; the path does not.

## 2. Install the adapter beside the runtime (not in git)

```bash
D=$HOME/rae/rae-cms-runtime/sso-adapter
git -C ~/mju-sso-integration archive v1.0.0-rc.6 src package.json | tar -x -C "$D"; chmod -R go-rwx "$D"
```
Mount it read-only and point the runtime at it (`rae-cms-runtime.service`):
`-v %h/rae/rae-cms-runtime/sso-adapter:/opt/mju-sso:ro` and `MJU_SSO_MODULE=/opt/mju-sso/src/index.js`.

## 3. Enable (owner gates, in order)

1. MJU issues the client id. Put `MJU_CLIENT_ID` only in `runtime.env` (mode 0600).
2. Apply migration `008_sso_identity_links.sql` (backup first).
3. Choose the subject claim. `humanID`/`personID`: `MJU_SSO_SUBJECT_CLAIM=humanID`. `citizenID` also needs
   `MJU_SSO_LAWFUL_BASIS_APPROVED=true` (owner decision C-14) and `MJU_SSO_APP_ID`, `MJU_SSO_HMAC_KEY` (≥ 32 bytes, per app).
4. Production + unverified contract needs the owner risk-acceptance file (`MJU_SSO_OWNER_RISK_ACCEPTANCE`),
   as the standard requires; without it the runtime refuses to start. That refusal is intended.
5. `MJU_SSO_ENABLED=true`, restart `rae-cms-runtime.service`. Rollback = unset it and restart.
6. First sign-in by an administrator creates a `pending` link; approve it from an existing admin session
   (`POST /cms-api/v1/sso/links/<id>/approve {"userId":"…"}`), then sign in again.

## 4. Routes

`GET /v1/sso/status` · `GET /v1/sso/login` · `GET /v1/sso/callback` · `POST /v1/sso/exchange` ·
`POST /v1/sso/logout` · `GET /v1/sso/links` · `POST /v1/sso/links/<id>/approve|revoke` (admin).
With SSO off, all of them answer `404`.
