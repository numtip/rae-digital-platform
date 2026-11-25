# MJU SSO for the CMS — what the owner must confirm (no new design)

The standard's own rules say a **new purpose needs a new C-14 record** (`C14_DECISION_RECORD.md` §7) and that a
risk acceptance must name its **scope** (`ADR-006-owner-accepted-production-risk`). The existing records were
written for the attendance consumer. These are the CMS-specific confirmations, using the same two decisions.

| # | Confirmation | Existing basis reused | Draft | Owner action |
|---|---|---|---|---|
| 1 | **C-14, CMS purpose.** Receiving `citizenID` to authenticate RAE staff into the CMS news desk; HMAC only, never stored raw, never logged; identity verification only | 2026-11-06 countersignature, PDPA ม.24(4), purpose-limited | text below | countersign (delegated controller) and keep the signed form outside git; give me the sha256 only |
| 2 | **Risk acceptance, CMS scope** | ADR-006, 2026-11-13, items C-01..C-07, C-09..C-13 | `deploy/production/sso-risk-acceptance.cms.DRAFT.json` | approve; I then copy it (renamed, `decision: accepted-owner-risk`, owner and date filled) into the runtime directory and set `MJU_SSO_OWNER_RISK_ACCEPTANCE` |
| 3 | **Human E2E window** for this client | `LIVE_E2E_PLAN.md` D-5 form (the 2026-11-06 window is for another client and has expired) | table below | fill the window, the tester, the consenting account |
| 4 | **Test account** | one staff member with a local CMS account (officer role is enough) | — | name the CMS user id; the person's identifier is never recorded |

## C-14 text for the CMS purpose (for the owner's form)

> Purpose: verify the identity of RAE staff signing in to the RAE CMS news desk. Data: the national id returned by
> MJU SSO, transformed immediately into an application-scoped HMAC; the raw value is not stored, logged or exported.
> Retention: the HMAC lives as long as the approved link. Access: the CMS runtime only. Not used for any other purpose.

## Human E2E window (to fill)

| Field | Value |
|---|---|
| Window (start → end, Asia/Bangkok) | ______ |
| Authorised by (MJU SSO administrator, distinct from the system owner) | role only |
| Operator | role only |
| Test account's CMS user id | ______ |
| Account holder consent | recorded: yes / no |
| Callback registered and active (MJU confirms) | yes / no |

**Enabling is refused by me until rows 1–4 are complete** and the Cloudflare hostname returns the site over HTTPS.
