# Blueprint module completion matrix

Status snapshot: **2026-10-26**, `main` @ `67969f1` (PRs #32–#37 merged) plus the open PRs named in the last column.
Verified against the tree (routes, files, workflows), not against the planning documents alone.

Legend — **Status**: ✅ implemented · 🟡 partial · ⬜ not started · ⛔ blocked
**Class** = what `docs/architecture/MODULE_REQUIREMENTS_MATRIX.md` says (BUILD / INTEGRATE / HYBRID).

> Sequencing note: `MODULE_REQUIREMENTS_MATRIX.md` and `DEVELOPMENT_ROADMAP.md` §2 mark Phase 1 as
> foundation (M10/M11/M13/M15/M20/M21), while the owner decision recorded in `README.md` §2 sets
> **Phase 1 = public website only**. Implementation follows the owner decision, so M01–M08 are built
> ahead of their documented phase. That is a sequencing deviation, not scope creep — no module outside
> the approved public-site scope has been started.

## Public website modules (approved Phase 1 scope)

| ID | Module | Class | Depends on | Status | Evidence | In PR |
|---|---|---|---|---|---|---|
| M01 | Public shell, routing, i18n, design system | BUILD | M15, M20 | 🟡 | `app/[locale]/layout.tsx`, `lib/i18n.ts` (NAV 7 links + search), `components/site-header.tsx`; `/knowledge` still absent | #29, #34 |
| M02 | Homepage & content sections | BUILD | M14, M18 | 🟡 | `app/[locale]/page.tsx`: hero photo, real CTAs, section links; statistics still labelled sample data | — |
| M03 | Document Center (public library) | BUILD | M15 | 🟡 | `/documents` + `/documents/category/<slug>` for 3 categories (10 outbound links), breadcrumb + `BreadcrumbList`; no record ids, versions or counts | #34 |
| M04 | Knowledge & static pages | BUILD | M14 | 🟡 | `/about`, `/research`, `/services`, `/documents`, `/news`, `/contact`, `/search` exist and carry a breadcrumb + `BreadcrumbList`; no FAQ/knowledge articles | #34 |
| M05 | Events & calendar | BUILD | M14 | ⬜ | no event route, no event data | — |
| M06 | Global search | BUILD | M03, M04, M12, M14 | 🟡 | `/search` + `lib/search-index.ts` + `components/content-search.tsx`, header form, indexes document categories and contact; `WebSite`+`SearchAction` JSON-LD now advertises it; still no personnel (M12 absent) | #29, #34, #40 |
| M07 | Contact & FAQ | BUILD | M15, M20 | 🟡 | `/contact` renders the verified address/phone and the **single official email `researchmju@mju.ac.th`**; **no form** (needs SMTP + PDPA basis) and no FAQ copy | #34, #38 |
| M08 | SEO, analytics, accessibility | BUILD | M01 | 🟡 | `app/sitemap.ts` (146 URLs incl. paginated news and document categories), `app/robots.ts`, Organization JSON-LD, per-page canonical/hreflang, `NewsArticle` JSON-LD on news pages, `scripts/check-contrast.mjs` measures WCAG AA on every exported page (4.5:1 body / 3:1 heading, tokens read from `globals.css`); no analytics, no axe run (browser-only checks stay manual) | #30 |
| M14 | News (data shape + detail pages) | BUILD | M15, M10 | 🟡 | 58 news items (title, date, type, body, image) back to 13 Jul 2026, `/news/[nid]` × 2 locales, index paginated 12/page with real URLs, 58/58 English headlines, no machine-translated bodies; no authoring workflow or revisions (needs M10/M15) | #30, #32, #33, #37 |

## Deferred / blocked modules

| ID | Module | Class | Status | Blocker |
|---|---|---|---|---|
| M10 | Auth, sessions, MFA, SSO | HYBRID | ⛔ | ADR-0003 still *Proposed* (gate A-3): Entra ID OIDC contract and a test account are not available |
| M11 | Users, roles, permissions | BUILD | ⛔ | needs M10 |
| M12 | Personnel & PDPA | HYBRID | ⛔ | gate A-4 (PDPA basis + retention) open; `ARCHITECTURE_QA.md` U-5 says M12 cannot ship until resolved |
| M13 | Departments / org structure | BUILD | ⛔ | unit lists exist only as page copy (`content/th/research.ts`, `services.ts`); department records need the DB (A-1) |
| M15 | Media library & uploads | BUILD | ⛔ | no storage target approved; ADR-0004 keeps master files in SharePoint and forbids a Graph runtime in v1 |
| M16 | Correspondence registry | BUILD | ⛔ | Phase 3; needs M10, M15 |
| M17 | Announcements & banners | BUILD | ⛔ | needs M14 authoring workflow |
| M18 | Admin shell & dashboard | BUILD | ⛔ | needs M10 and most admin modules |
| M19 | Reports & exports | BUILD | ⛔ | Phase 3 |
| M20 | Settings & theming | BUILD | ⛔ | needs DB; today `SITE_URL` is env-driven with `TODO(owner)` in `lib/i18n.ts` |
| M21 | Audit & activity logs | BUILD | ⛔ | needs M10 |
| M22 | Backup & restore | BUILD | ⛔ | no job runner |
| M23 | Public API / OpenAPI | BUILD | ⛔ | static export has no server routes; ADR-0001 A-1 (Node runtime) unresolved |
| M30 | Assets (ครุภัณฑ์) | HYBRID | ⛔ | gate A-6: "INTEGRATE if ERP owns the asset register `[U]`" — undecided |
| M31 | Vehicles | INTEGRATE | ⛔ | external system API availability is `[U]` |
| M32 | Meeting rooms | INTEGRATE | ⛔ | external system API availability is `[U]` |
| M34 | Dynamic forms | BUILD | ⛔ | Phase 4 |
| M35 | Complaints | BUILD | ⛔ | Phase 3; needs PDPA notice + tracking code |
| M36 | Notifications | BUILD | ⛔ | needs SMTP settings (M20) |
| M37 | AI assistance | DEFER | ⛔ | matrix §7: DEFER to phase 5 |

No M09, M24–M29 or M33 exist in any document — do not invent them.

## Content blockers (not module blockers)

| Item | Why it cannot be filled |
|---|---|
| Homepage statistics (4 figures) | The office publishes **no** count of projects, publications, staff or communities served. ADR-0002 requires `source` + `as_of` per figure; gate A-7 open. Figures stay labelled as design-mockup sample data. |
| Service catalogue with fees | Not published as a page. Only two PDFs on `erp.mju.ac.th` (converted-farm demonstration fees, produce price list). |
| Publications listing | Not on the office site; it links out to `erp.mju.ac.th/researchIndex.aspx`. |
| Knowledge articles / FAQ | No approved copy exists. |
| Event calendar | No approved event or holiday list. |
| `/th/news` beyond 12 items | Page 1 of 125 was captured; further items need a fetch decision (snapshot vs sync). |
| Facebook page posts | **Owner decision 2026-10-25**: keep the official-website (WTMS) news as the source for now, and add Facebook posts one at a time as the owner shares each permalink. Reason: a Facebook page's post list is behind a login wall for logged-out readers, so no complete, ordered harvest back to July 2569 is possible without a page token or an export. A single public permalink *is* readable and yields the full text plus up to 5 photos (verified), so per-link additions work. |
| Production domain | Owner decision pending; preview hardcodes the GitHub Pages origin. |

## ADR constraints that bind the next slice

- **ADR-0001 (Proposed)** — modular monolith (Next.js + MySQL + Prisma) only after gate A-1; "if MJU hosting forbids a public Node runtime, this ADR is void". No DB, worker or `/api/v1` work may start before that.
- **ADR-0002 (Approved)** — single colour authority (no raw hex outside the token file), no `href="#"` in nav/CTA data, statistics require `source` + `as_of`.
- **ADR-0004 (Accepted)** — master files stay in SharePoint; the platform stores metadata + `storage_url` only; no Microsoft Graph runtime in v1. The Document Center may link, never mirror.
- **ADR-0005 (Implemented)** — `/th/` primary, `/` → `/th/` with 307, copy outside components (`SiteContent = typeof th`), missing translation explicit, per-locale reciprocal SEO, prototype statistics are sample data, **no new dependency without owner approval**.

## Content gate (shipped)

`tests/content.test.mjs` + `npm test` (node:test, no dependencies) enforce, on every run:
both locales have the same number of content files, every `url:` in content is https,
every `source: {` block carries `retrieved:`, the homepage statistics keep their
sample-data label, no content value is left as the literal `TODO(translate)`, and news
items all have a unique `nid`, an ISO date and are ordered newest first.
Verified red: changing one URL to `http://` fails the suite; reverting makes it pass.

## Next three batches (unblocked, functional first)

1. **Content contract + provenance gate.** `lib/content.ts` (`Provenance`, `DocumentGroup`, `Statistics` with mandatory `source`/`as_of`), retype the content files against it, and `scripts/check-content.mjs` + `node --test` asserting: every URL is https, every page object carries `source.retrieved`, no unresolved `TODO(translate)`, and rendered link count equals declared link count. Proof: `npm test` goes red when one URL is changed to `http://`.
2. **Documents → category routes + breadcrumb + JSON-LD.** Add `slug` to each of the 3 document groups, `app/[locale]/documents/category/[slug]/page.tsx` with `generateStaticParams` + `dynamicParams = false`, a `Breadcrumb` in `components/page-shell.tsx`, `BreadcrumbList` JSON-LD, and sitemap entries with the existing `languagesFor()` helper. Proof: 6 new routes built and 6 new `<loc>` with 3 alternates each.
3. **IA completion: `/contact` + 7th nav item.** Static contact page from the already-verified `content/<locale>/site.ts` `footer` block (no form — that needs SMTP), added to `NAV` and `PAGES` so header and sitemap pick it up automatically. Proof: 7 nav `<a>` with real hrefs on both locales, 2 new sitemap URLs, `href="#"` count still 0.

## Updates since the 2026-10-25 snapshot

- **#32/#33/#37** — news archive (58 items back to 13 Jul 2026), 58/58 English headlines,
  three image widths per photo, and a paginated index (12/page, `/news/` = page 1,
  `/news/page/2…5/`, page 6 a real 404). sitemap 38 → **146 URLs**.
- **#34/#36** — content gate (`npm test`, 7 assertions) and export integrity
  (`scripts/check-export.mjs`) wired into CI; document categories with breadcrumbs;
  `/contact`; contact as the 7th nav item.
- **#38 (open)** — one official contact email; the site previously showed three.
- **#39 (open)** — owner-supplied Maejo University emblem, masked and fitted; tab icon.
- **#40 (open)** — per-section link names, `WebSite`/`SearchAction` JSON-LD, bilingual 404.
- Licence position is assessed in `docs/governance/LICENSE_RECOMMENDATION.md`; **no LICENSE
  file is added** because content ownership is unresolved.
