# MJU SSO — consolidated approval pack and owner E2E (CMS)

Test account: the owner's own MJU account, linked to the **existing CMS user `prinya`** (role `admin`, unchanged).
The MJU e-mail is a reference for the human only and is not recorded here or used as a subject: the authoritative
subject is the provider's `citizenID`, stored only as `HMAC-SHA256(key, app "rae-cms", provider, citizenID)`.

## Why the link is not pre-created
The link key is derived from the `citizenID` the provider returns at sign-in. Nobody — including this system —
may hold that value in advance, so an approved link cannot be written beforehand. The standard's route is:
first sign-in creates a **pending** link (no session), an administrator approves it for `prinya`, the second
sign-in succeeds. Nothing is auto-approved, and the e-mail never authorises anything.

## Owner approvals (all four needed before I enable SSO)
| # | Item | Draft | State |
|---|---|---|---|
| 1 | C-14, CMS purpose (identity verification into the news desk; HMAC only) | `mju-sso-owner-approvals.md` | countersign; give me the sha256 only |
| 2 | Risk acceptance, CMS scope | `deploy/production/sso-risk-acceptance.cms.DRAFT.json` | approve; I install it and set `MJU_SSO_OWNER_RISK_ACCEPTANCE` |
| 3 | E2E window + MJU SSO administrator's written authorisation for this client | form in `mju-sso-owner-approvals.md` | fill and return |
| 4 | Test account | CMS user `prinya` (admin), owner-performed | **provided** |

Note on item 4: `prinya` is an admin, so this run proves sign-in, linking, rotation and logout but cannot show a
*restricted* role through SSO. RBAC itself is covered by tests (an officer link cannot reach admin routes). If you
want a restricted-role live check, link a second, non-admin CMS user in a later window.

## Enable (me, after 1–3)
`MJU_SSO_LAWFUL_BASIS_APPROVED=true`, `MJU_SSO_OWNER_RISK_ACCEPTANCE=<installed file>`, `MJU_SSO_ENABLED=true`,
restart `rae-cms-runtime`, run `deploy/production/sso-e2e-preflight.sh`. Rollback: `MJU_SSO_ENABLED=false` + restart.
Local password login is untouched throughout.

## Owner-performed E2E (inside the authorised window)
1. Open `https://rae-cms.raemanagemju.net/th/cms-admin/` → **เข้าสู่ระบบด้วย MJU SSO** → sign in at MJU.
   Expected: back on the desk with an "not approved yet" message; no session.
2. Local emergency login as `prinya`, then on the server or any shell:
   `deploy/production/sso-approve-link.sh prinya list` → copy the pending link `id`, then
   `deploy/production/sso-approve-link.sh prinya approve <id> prinya` (asks for the password; never printed).
3. Sign out, then **MJU SSO** again. Expected: signed in as `prinya`, role admin.
4. Sign out. Expected: MJU sign-out page; the old token is rejected.
5. Negative: use the browser Back/refresh on the callback (refused), and confirm local login still works.
6. Tell me the time; I check the audit rows (`sso.login`, `sso.link.approve`) and the runtime log for the outcome codes.
