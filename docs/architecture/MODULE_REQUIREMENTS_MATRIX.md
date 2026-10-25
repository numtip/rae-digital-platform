# MODULE_REQUIREMENTS_MATRIX.md
### Functional inventory → module classification (`BUILD` / `INTEGRATE` / `DEFER`)

| | |
|---|---|
| **Date** | 2026-10-24 |
| **Requirement source** | `exitfull.txt` — every capability block traced 1:1 in §5 (30 blocks → 30 rows, 29 owned + 1 deferred, 0 unowned) |
| **Architecture** | `RAE_PLATFORM_ARCHITECTURE.md` (Option 1 — modular monolith, recommended) |
| **Status** | `RAE_ARCHITECTURE_READY_FOR_REVIEW` · blocker `PROJECT_ENROLLMENT_REQUIRED` |

**Rules applied**

1. `exitfull.txt` is a **functional inventory**. Its PHP/AdminLTE stack is not adopted (constraint C1).
2. Every module is classified against **what MJU/RAE already operates**, verified from the previously captured RAE systems inventory (`EVIDENCE/notes/rae_home_outline.txt`) and the audit (`REFERENCE_AUDIT.md §2.8`).
3. A module is only `INTEGRATE` when an existing system genuinely covers the need; otherwise `BUILD`. `DEFER` means out of the first production release with a stated trigger.
4. No module may write to, migrate from, or depend on the legacy WTMS database (constraint C7).

---

## 0. Summary

| Layer | Modules | BUILD | INTEGRATE | HYBRID (build + integrate) | DEFER |
|---|---|:--:|:--:|:--:|:--:|
| A · Public website | 8 | 8 | 0 | 0 | 0 |
| B · Admin & CMS | 14 | 12 | 0 | 2 | 0 |
| C · Modular systems | 7 | 3 | 2 | 1 | 1 |
| **Total** | **29** | **23** | **2** | **3** | **1** |

Priority: **P0 = 14**, **P1 = 11**, **P2 = 4**.
Phase 1 foundation → 2 content → 3 operations I → 4 operations II → 5 intelligence → 6 cutover (see `DEVELOPMENT_ROADMAP.md`).

---

## 1. Layer A — Public website

| ID | Module | Requirement (from `exitfull.txt`) | Class | Pri | Phase | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| **M01** | Public shell, routing, i18n, design system | Website: home, about, vision, mission, org structure, executives, staff, news, activities, downloads, FAQ, contact; responsive; SEO (#19), UI modern/professional/responsive/skeleton/dark mode (#23) | **BUILD** (Stitch V2 visual **REUSE**) | P0 | 1 | M15, M20 | `<html lang>` correct per locale; 7 nav sections reachable; no `href="#"`; Lighthouse a11y ≥ 95; tokens only, zero raw hex outside `tokens.css` |
| **M02** | Homepage & content sections | Home hero, services, research/innovation, statistics, knowledge, partners, news preview | **BUILD** on Stitch V2 components | P0 | 2 | M14, M18 | Every statistic has source + date (no placeholder values); hero has 1 primary CTA; LCP ≤ 2.5 s; mobile height ≤ 6,500 px at 412 px |
| **M03** | Document Center (public library + admin) | Download documents: category, file, download count, version, upload, PDF preview (#12) | **BUILD** (model + UI **REUSE/ADAPT**) | P0 | 2 | M15 | 6 taxonomy categories; `RAE-DC-####` unique ids; status/visibility enforced; download counted; pagination ≥ 50 docs; linked from nav + sitemap |
| **M04** | Knowledge & static pages | About/vision/mission/org, knowledge articles, FAQ, policy pages, e-books | **BUILD** | P1 | 2 | M14 | Content editable via CMS; breadcrumb + `updated` date on every page; 0 orphan pages |
| **M05** | Events & calendar | Activities, meetings, training, holidays; Google Calendar; FullCalendar (#11) | **BUILD** (+ `.ics` export) | P1 | 2 | M14 | Upcoming list + month view; `.ics` per event; past events archived; empty state when none |
| **M06** | Global search | Global search, filter, advanced search, auto-complete (Thai) (#25) | **BUILD** | P0 | 2 | M03, M04, M12, M14 | Thai queries without spaces return results (30-query fixture ≥ 90 % hit); grouped results; ≤ 300 ms p95; zero-result page offers top tasks |
| **M07** | Contact & FAQ | Google Maps, phone, email, social, contact form, captcha (#16) | **BUILD** | P1 | 2 | M15, mail transport via M20 settings | Form validates server-side, rate-limited, sends confirmation; map is a static image + link (no third-party JS on load); PDPA consent line |
| **M08** | SEO, analytics, accessibility | Responsive, SEO (#19); first-party analytics; sitemap; structured data | **BUILD** | P0 | 2 | M01 | `sitemap.xml` index valid; `hreflang` reciprocal; JSON-LD validates for Organization/WebSite/BreadcrumbList/NewsArticle; 0 AA contrast failures |

---

## 2. Layer B — Administration & CMS

| ID | Module | Requirement (from `exitfull.txt`) | Class | Pri | Phase | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| **M10** | Auth, sessions, MFA, SSO | Login, roles Admin/Director/Manager/Officer/Staff/Guest, forgot/reset, remember me, OTP email, 2FA, log login, logout (#2); session timeout, password hash (#27) | **HYBRID — INTEGRATE** (Entra ID OIDC) **+ BUILD** (local) | P0 | 1 | — | OIDC login works with Entra ID `[U]` contract; Argon2id local login; TOTP enrolment for privileged roles; session revoke on role change; 5-failure lockout; every login audited |
| **M11** | Users, roles, permissions | Add/edit/delete/search users, assign rights, reset password, upload photo, export Excel/PDF/print (#3); role permission (#27) | **BUILD** | P0 | 1 | M10 | Permission matrix editable; `requirePermission` enforced on 100 % of admin routes (test asserts 403); no privilege escalation without `user:assign_role`; export respects scope |
| **M12** | Personnel & PDPA | Code, national id, name, gender, birth date, age, position, academic rank, level, work group, department, phone, email, LINE, Facebook, address, education, work history, training history, photo, attachments (#4) | **HYBRID — INTEGRATE** (MJU HR directory sync) **+ BUILD** (RAE fields) | P1 | 2 | M13, M15 | `personnel_private` encrypted and unreachable from public API (test); public directory only `is_public=1` + consent; sync idempotent; national id never in logs or URLs |
| **M13** | Departments / org structure | Add/edit/delete/search/order, name, head, description, logo, unit colour (#5) | **BUILD** | P0 | 1 | — | Tree with parent/child; `head_personnel_id` nullable until M12 ships; used by nav/footer/org chart; cannot delete a department that has personnel rows (enforced once M12 is live) |
| **M14** | News CMS + workflow | Categories, tags, banner, gallery, video, PDF, publish date, pinned, SEO URL, share Facebook (#6) | **BUILD** | P0 | 2 | M15, M10 | Draft→review→approve→publish with two-person rule for pinned items; scheduled publish; slug immutable after publish; revisions stored; `NewsArticle` schema emitted |
| **M15** | Media library & uploads | Upload PDF/DOCX/XLSX/ZIP/PNG/JPG/WEBP/MP4, size limit, rename, preview (#29) | **BUILD** | P0 | 1 | — | Magic-byte validation + MIME allow-list; AVIF/WebP derivatives at 4 widths; alt text required; EXIF stripped; orphan cleanup job; no executable content served |
| **M16** | Correspondence registry | Incoming/outgoing letters, number, date, subject, sender, receiver, status, PDF, search, export, QR code, barcode (#7) | **BUILD** (registry only; files in SharePoint) | P1 | 3 | M10, M15 | Running number per fiscal year with no gaps (DB constraint + test); status transitions audited; QR resolves to a permission-checked view; export Excel/PDF; 0 files stored on the web server |
| **M17** | Announcements & banners | Popup, banner, scrolling text, notification (#13) | **BUILD** | P1 | 2 | M14 | Schedule + expiry enforced server-side; popup frequency capped per session; dismissible and keyboard accessible; no layout shift |
| **M18** | Admin shell, dashboard & widgets | Counts: personnel, units, news, documents, assets, vehicles, users, visitors; charts: staff by unit, news history, budget, system usage, login report (#1); widgets weather/calendar/clock/announcement/quick menu/recent activity (#24) | **BUILD** | P0 | 2 | most modules | Sidebar + topbar + dark mode + skeleton; each widget has its own loading/error state; visitor count is first-party; weather is optional and `DEFER` if no free licensed API |
| **M19** | Reports & exports | Reports for every module; export PDF/Excel/CSV/Word/print; dashboard (#17) | **BUILD** | P1 | 3 | M14, M16, M35 (each module ships its own report; later modules add theirs) | Every module with data has ≥1 report; exports match on-screen filters; PDF/A for archival; exports audited and rate-limited |
| **M20** | Settings & theming | Logo, favicon, system/org name, address, phone, email, SMTP, theme, dark/light, language, fiscal year, maintenance mode (#20) | **BUILD** | P0 | 1 | — | Typed settings with validation; SMTP test button; maintenance mode returns 503 + friendly page for public only; fiscal-year change doesn't mutate historical records; secrets never rendered back |
| **M21** | Audit & activity logs | Log login, user, delete, edit, export, activity, audit trail (#21) | **BUILD** | P0 | 1 | M10 | Append-only; actor/entity/before/after/IP/request-id; searchable by actor/date/entity; retention 2 years; app DB user has no UPDATE/DELETE grant on the table |
| **M22** | Backup & restore | Auto backup, manual backup, restore, download SQL (#28) | **BUILD** | P0 | 2 | — | Nightly dump + checksum; manual trigger requires `backup:run` + 2FA; restore tested quarterly into staging; download requires `super_admin` and is audited |
| **M23** | Public API, OpenAPI, tokens | REST API, JSON, JWT auth, Swagger documentation (#26) | **BUILD** | P1 | 2 | M03, M04, M14 | OpenAPI 3.1 generated in CI and published at `/api/docs` (admin-only); public read API cached + rate-limited; partner tokens scoped and revocable; no endpoint returns PII |

---

## 3. Layer C — Modular organization systems

| ID | Module | Requirement (from `exitfull.txt`) | Class | Pri | Phase | Existing MJU/RAE system | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| **M30** | Assets (ครุภัณฑ์) | Code, name, type, brand, model, serial, price, fiscal year, room, custodian, photo, QR, barcode, loans, repairs, history (#8) | **HYBRID — INTEGRATE if ERP owns the asset register `[U]`, else BUILD** | P2 | 4 | MJU ERP (`erp.mju.ac.th`) — asset module unknown `[U]` | Decision recorded before build; if BUILD: asset code unique, QR label printable, loan/repair state machine audited, custodian changes historised |
| **M31** | Vehicles (รถราชการ) | Plate, model, brand, colour, type, custodian, insurance, tax, inspection, repair history, booking, approval, calendar (#9) | **INTEGRATE** (existing vehicle log) | P2 | 3 | `ระบบบันทึกการใช้ยานพาหนะ สำนักวิจัยฯ` `[V*]` | v1 deep-links to the existing system; if booking/approval is missing there, add only the booking layer and keep the log as SoT; expiry alerts 30 days ahead |
| **M32** | Meeting rooms (ห้องประชุม) | Add room, photo, seats, equipment, booking, approval, calendar, Google Calendar (#10) | **INTEGRATE** | P2 | 3 | `ระบบจองห้องประชุมสำนักวิจัยฯ` `[V*]` | v1 deep-links; embed availability only if an API exists `[U]`; the `room_bookings` table is a **mirror used only in fallback mode** and stays empty while the external system is authoritative; no duplicate booking store |
| **M34** | Dynamic forms | Self-service form builder: text, textarea, date, time, number, dropdown, checkbox, radio, upload, signature; export Excel/PDF (#14) | **BUILD** | P1 | 4 | — | 10 field types + conditional visibility; published form version immutable; submissions exportable; signature stored as image + hash; spam controls |
| **M35** | Complaints (ข้อร้องเรียน) | Submit, attach, track status, admin reply, email notify (#15) | **BUILD** | P1 | 3 | — | Tracking code + status page without login; reporter email notified on reply; internal notes never exposed; SLA timer + overdue flag; PDPA notice at submit |
| **M36** | Notifications | In-app bell, email, LINE Notify (optional), Telegram (optional) (#18) | **BUILD** (email/in-app), **DEFER** LINE/Telegram | P1 | 3 | SMTP (MJU mail) | Notification preferences per user; delivery attempts logged with status; no PII in email body beyond the minimum; failures retried with backoff |
| **M37** | AI assistance | AI search, summarise report, chatbot assistant, AI news drafting, AI Q&A, dashboard analysis (#AI) | **DEFER** | P2 | 5 | — | Provider-agnostic gateway; no PII in prompts; every call audited; human review required before publishing AI-drafted text; cost cap per month; feature flag per capability |

---

## 4. Cross-cutting requirements (not modules)

| ID | Requirement | Source | Where implemented | Acceptance |
|---|---|---|---|---|
| X-01 | SQL injection defence | #27 | Prisma + lint rule | 0 raw string concatenation; injection test suite passes |
| X-02 | XSS defence | #27 | sanitizer + CSP nonce | CSP report-only shows 0 violations in staging |
| X-03 | CSRF defence | #27 | server actions + token | cross-origin POST rejected |
| X-04 | Password hashing | #27 | Argon2id | hash params verified; no MD5/SHA1 anywhere |
| X-05 | Session timeout | #27 | DB sessions | idle 8 h / absolute 12 h enforced by test |
| X-06 | HTTPS-ready | #27 | nginx + HSTS | HTTP→HTTPS 301; no mixed content |
| X-07 | CAPTCHA / anti-bot | #16, #27 | rate limits first; captcha only on abuse signal | form abuse rate < threshold without captcha |
| X-08 | ER diagram + normalised schema | #22 | `DATABASE_AND_API_BLUEPRINT.md` | 3NF where practical; FK coverage 100 %; no orphan tables |
| X-09 | Dark/light mode | #20, #23 | tokens + `prefers-color-scheme` | both themes pass AA contrast |
| X-10 | Loading / skeleton states | #23 | shared UI kit | every async surface has skeleton + error + empty state |

---

## 5. `exitfull.txt` coverage check

Every enumerated capability block is owned by at least one module. This table is the traceability record.
`exitfull.txt` has **30 capability blocks** (sections 1–30, delimited by `⸻`); section 31
`ผลลัพธ์ที่ต้องการ` is the expected-outcome summary, not a capability block. Rows are numbered 1–30.

| # | Capability block in `exitfull.txt` | Owner module(s) | Class |
|---|---|---|---|
| 1 | Dashboard counts + charts | M18 | BUILD |
| 2 | Login, roles, forgot/reset, remember, OTP, 2FA, log | M10 | HYBRID (OIDC + local) |
| 3 | Users CRUD + permissions + exports | M11 | BUILD |
| 4 | Personnel fields, photo, attachments | M12 | HYBRID (HR sync + build) |
| 5 | Departments CRUD | M13 | BUILD |
| 6 | News + categories/tags/gallery/SEO/pin | M14 | BUILD |
| 7 | Documents registry รับ–ส่ง, QR/barcode | M16 | BUILD |
| 8 | Assets + loans + repairs | M30 | HYBRID (integrate or build) |
| 9 | Vehicles + booking/approval | M31 | INTEGRATE |
| 10 | Meeting rooms + booking | M32 | INTEGRATE |
| 11 | Calendar + Google Calendar/FullCalendar | M05 | BUILD |
| 12 | Download documents + version + count | M03 | BUILD |
| 13 | Announcements popup/banner/ticker | M17 | BUILD |
| 14 | Dynamic form builder + export | M34 | BUILD |
| 15 | Complaints + tracking + reply | M35 | BUILD |
| 16 | Contact + map + captcha | M07 | BUILD |
| 17 | Reports across modules + exports | M19 | BUILD |
| 18 | Notifications bell/email/LINE/Telegram | M36 | BUILD/DEFER |
| 19 | Public website pages + responsive + SEO | M01, M02, M04 | BUILD |
| 20 | Settings incl. maintenance + fiscal year | M20 | BUILD |
| 21 | Logs: login/user/delete/edit/export/audit | M21 | BUILD |
| 22 | ER diagram, PK/FK, normalisation, SQL | X-08 + `DATABASE_AND_API_BLUEPRINT.md` | DELIVERABLE |
| 23 | UI: modern, sidebar, mega menu, cards, modal, animation, skeleton, dark mode | M01 (public), M18 (admin), X-09/X-10 | BUILD |
| 24 | Dashboard widgets (weather, clock, recent activity, visitors) | M18 | BUILD (weather P2) |
| 25 | Search: global, filter, advanced, autocomplete | M06 | BUILD |
| 26 | API: REST, JSON, JWT, Swagger | M23 | BUILD |
| 27 | Security: CSRF/XSS/SQLi/hash/roles/timeout/captcha/HTTPS | X-01…X-07 + M10/M11 | BUILD |
| 28 | Backup: auto/manual/restore/download | M22 | BUILD |
| 29 | Uploads: types, size limit, rename, preview | M15 | BUILD |
| 30 | AI search/summarise/chatbot/write/Q&A/dashboard | M37 | DEFER |

**Coverage: 30/30 blocks assigned — 29 owned by a BUILD/INTEGRATE module + 1 deferred (block 30 → M37). 0 unowned requirements.**

---

## 6. Explicit deviations from `exitfull.txt`

| Requirement | Deviation | Reason |
|---|---|---|
| PHP 8.2, MySQL, Bootstrap 5, AdminLTE 3, jQuery, SweetAlert2, DataTables, Chart.js, Font Awesome, PHPMailer, mPDF, PhpSpreadsheet | Replaced by Next.js 16, React 19, Tailwind 4, Radix-style primitives, TanStack Table, Recharts/ECharts, Lucide, Nodemailer, React-PDF/Playwright, ExcelJS | Constraint C1 + C2 |
| MVC folder pattern | Replaced by module vertical slices (`schema/policy/service/repository/ui`) | App Router + server actions; MVC controllers do not map to RSC |
| Bootstrap grid | Tailwind grid with 6 breakpoints | Stitch V2 baseline |
| Google Login | Entra ID OIDC (+ optional Google for external users `[U]`) | MJU identity is Microsoft-based |
| Six roles (Admin, Director, Manager, Officer, Staff, Guest) | Six source roles **plus `super_admin`** for settings/backups/tokens | Separation of duties; recorded as a deviation, reversible if the owner objects |
| JWT authentication for API | Opaque session cookie for humans; **JWT access token (15 min) + revocable refresh token** for machines | Revocation and auditability while satisfying `exitfull.txt #26` |
| Shared-hosting deploy | VPS with Node + nginx + MySQL | `exitfull.txt`’s shared-hosting target cannot run Next.js server features |
| Chart.js | Library-agnostic chart components (Recharts default) | Same capability, React-native |

---

## 7. Deferred / excluded register

| Item | Decision | Trigger to revisit |
|---|---|---|
| M37 AI features (`exitfull.txt` block 30 — the only block with no BUILD/INTEGRATE owner) | DEFER to phase 5 | A named provider with a data-processing agreement + budget cap |
| LINE Notify / Telegram | DEFER | Staff request + token provisioning |
| Weather widget | DEFER | A licensed free-tier API is approved |
| Microsoft Graph document proxy | EXCLUDED (v1) | A validated need to serve files that SharePoint cannot share externally |
| Full-text search service (Meilisearch) | DEFER | MySQL ngram recall < 90 % on the fixture set |
| Dark mode on public site | OPTIONAL | After launch, if analytics show OS-level dark preference > 30 % |
| BI/Metabase embedding | DEFER | Reporting module cannot answer executive questions |
| Mobile app | EXCLUDED | Not in scope; the public site is responsive |
| Legacy WTMS DB migration | EXCLUDED | Directive C7 — content re-authored, not migrated |
| Duplicate of ERP/HR/IRB/research DB | EXCLUDED | Never build a second source of truth for data another system owns |

---

## 8. Module acceptance gates by phase

| Phase | Modules that must pass their acceptance criteria before the next phase starts |
|---|---|
| 1 | M10, M11, M13, M15, M20, M21, M01 (shell + tokens) |
| 2 | M02, M03, M04, M05, M06, M07, M08, M12, M14, M17, M18, M22, M23 |
| 3 | M16, M19, M31, M32, M35, M36 |
| 4 | M30, M34 |
| 5 | M37 |
| 6 | cutover checklist (`DEVELOPMENT_ROADMAP.md §6`) |

A phase gate requires: automated tests green, accessibility check on new surfaces, audit-log integration test, and a demo to the module owner.
