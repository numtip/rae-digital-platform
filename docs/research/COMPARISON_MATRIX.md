# COMPARISON_MATRIX.md
### RAE vs. SPU vs. UTCC vs. DPU — what to adopt, adapt or reject

**Scoring legend** (applied consistently; scores are *judgements* derived from the measurements in `REFERENCE_AUDIT.md`, not measurements themselves). **Section scores are the arithmetic mean of the rows in that matrix; each site's overall score (section 6) is the mean of the five section scores.**

| Score | Meaning |
|---|---|
| 5 | Exemplary — worth imitating |
| 4 | Strong, minor gaps |
| 3 | Adequate / mixed |
| 2 | Weak, causes user friction |
| 1 | Failing — blocks a task or breaks a rule |

---

## 1. Matrix A — Information architecture & navigation

| Criterion | RAE | SPU | UTCC | DPU | Note |
|---|:--:|:--:|:--:|:--:|---|
| Audience segmentation in nav | **1** | 4 | **5** | 4 | UTCC nav is literally six audiences |
| Section depth / findability | **1** | 4 | 4 | 4 | RAE: only 4 top-level destinations, 3 duplicate labels |
| Mega-menu / task grouping | 1 | **5** | 4 | **5** | SPU 102 links, DPU 46 task→system links |
| Breadcrumbs | 2 | 3 | **4** | 3 | RAE has a title bar, not a trail |
| Site search | **1** | 2 | **4** | **1** | none / none on home / real form / none |
| Language switching | 2 | **5** | 2 | 4 | SPU `hreflang` trio; RAE `?lang=` only |
| Utility bar (staff/system links) | 3 | 3 | 3 | **4** | RAE exposes admin login publicly |
| Internal-system clarity | 1 | 3 | 3 | **4** | DPU labels `Staff`, `SLCM`, `Alumni` |
| Dead/duplicate destinations | **1** | 4 | 4 | 4 | RAE: 1×404 + 3 duplicate pairs |
| **Section score** | **1.4** | 3.7 | 3.7 | 3.7 | |

## 2. Matrix B — Visual system & homepage UX

| Criterion | RAE | SPU | UTCC | DPU | Note |
|---|:--:|:--:|:--:|:--:|---|
| Brand coherence | **2** | **5** | **5** | **5** | RAE mixes green with 6 unrelated hues |
| Typography system | **1** | 3 | 3 | 4 | RAE: 2 families, 11 sizes, no scale |
| Colour discipline | **1** | 4 | 4 | **5** | RAE uses raw Bootstrap colour utilities |
| Hero effectiveness | **1** | 4 | 3 | 4 | RAE: 7 autoplay banners, baked-in text |
| Task entry points above the fold | **1** | **5** | 4 | 4 | RAE's first CTA-free screen is a photo |
| Card/component consistency | **2** | 4 | 3 | 4 | RAE: 4 competing card styles |
| Information density | 2 | 3 | **1** | 4 | UTCC ships 2,637 articles |
| Trust signals (updates, contacts, policy) | 3 | 4 | 3 | **5** | DPU PDPA banner + policy pages |
| **Section score** | **1.6** | 4.0 | 3.3 | 4.4 | |

## 3. Matrix C — Responsive, performance, engineering

| Criterion | RAE | SPU | UTCC | DPU | Evidence |
|---|:--:|:--:|:--:|:--:|---|
| Mobile layout integrity | **1** | 3 | 2 | **4** | RAE grows 2.72×; DPU 1.18× |
| Mobile navigation | **1** | 4 | 3 | 4 | RAE: modal behind an unlabelled icon |
| Document weight | **3** | 3 | **1** | 3 | 150 KB vs 403 KB vs **8.96 MB** vs 282 KB |
| Requests, first load | **4** | 2 | 3 | 2 | 59 / 174 / 127 / 205 |
| Load event, lab | **1** | 4 | **1** | **4** | 7,585 / 1,203 / 7,474 / 1,816 ms |
| Image delivery (lazy/srcset/format) | **1** | 4 | 4 | 4 | RAE: 6/27 lazy, no `srcset` |
| Third-party restraint | 2 | 2 | 2 | 2 | all four carry analytics/martech |
| Viewport meta correctness | 3 | 4 | **1** | 4 | UTCC sets `user-scalable=0` |
| **Section score** | **2.0** | 3.3 | 2.1 | 3.4 | |

## 4. Matrix D — Accessibility & SEO

| Criterion | RAE | SPU | UTCC | DPU | Evidence |
|---|:--:|:--:|:--:|:--:|---|
| `lang` + document semantics | **1** | 4 | 4 | 4 | RAE: no `lang` |
| Landmarks / regions | **1** | 3 | 3 | 2 | RAE 0/0/0/1; DPU no footer landmark |
| Heading structure | **1** | 2 | 3 | **1** | RAE 0 `h1`; DPU: only 2 headings, both in the cookie dialog |
| Skip link | **1** | **5** | **5** | 1 | — |
| Text contrast ≥ AA | 2 | **4** | 2 | 3 | 14 / 5 / 27 / 10 failures |
| Target size ≥ 24 px | 3 | 2 | 2 | **1** | 4 / 34 / 61 / 69 sub-24 px |
| Image `alt` coverage | 3 | **5** | 3 | 3 | 4/34 missing vs 0/63 vs 6/2,677 |
| Link accessible names | 3 | 2 | 2 | 2 | 6 / 19 / 18 / 13 unnamed |
| Title & meta description | **1** | **5** | **5** | 4 | RAE empty titles on wID pages |
| Canonical + `hreflang` | **1** | **5** | 4 | 2 | RAE has neither |
| Structured data | **1** | **5** | 4 | 4 | 0 / 3 / 2 / 1 blocks |
| Crawlability (`robots`+sitemap) | **1** | **5** | **5** | 2 | RAE 404/404; DPU HTML-shell sitemap |
| URL semantics | **1** | 4 | 4 | 4 | RAE `wID=`/`nID=` integers |
| **Section score** | **1.5** | 3.9 | 3.5 | 2.5 | |

## 5. Matrix E — Content operations & platform

| Criterion | RAE | SPU | UTCC | DPU | Note |
|---|:--:|:--:|:--:|:--:|---|
| Editor usability | 2 `[U]` | 3 | 3 | 4 | RAE = custom CMS, unknown UX |
| Design-system reuse in CMS | **1** | 2 | 2 | **5** | DPU Tailwind tokens vs RAE inline styles |
| Bilingual workflow | **1** | **5** | 2 | 3 | WPML vs `?lang=` manual duplication |
| Front-end maintainability | 2 | 2 | 1 | 4 | 56 CSS files (SPU), 2 sliders (UTCC) |
| Analytics / measurement | 3 | 4 | 4 | 4 | all four: GA4 |
| PDPA/consent readiness | 1 | 2 | 2 | **5** | only DPU has a real consent banner |
| Hosting fit for MJU | **5** | 3 | 3 | 2 | RAE = IIS now; Nuxt needs Node `[A]` |
| **Section score** | **2.1** | 3.0 | 2.4 | 3.9 | |

---

## 6. Per-site verdict

### RAE (current) — **1.7 / 5 overall**
**Strengths to preserve:** authentic institutional green `#017F3F`; complete, honest content set (news, 20+ tools, units, journal, e-books, director's channel); Thai-first editorial voice; existing relationships with every MJU subsystem (`erp`, `irb`, `kb`, `rspg`, ThaiJO, `maejovision`); an already-curated *concept* of "Quick Access" that only needs structure.
**Weaknesses:** IA is a link farm; no search; no `h1`/`lang`/landmarks; 14 contrast failures; 7-slide text-in-image hero; 11,953 px mobile page; 404 on a header link; no sitemap; empty page titles; 7.6 s load.

### SPU — **3.6 / 5**
Take: task grid, mega-menu discipline, `hreflang`, FAQ schema, `alt`/skip-link hygiene.
Avoid: 650 px carousels, 56 stylesheets, chat-widget `h1`, internal systems in primary nav.

### UTCC — **3.0 / 5**
Take: audience-first nav, four-beat editorial rhythm, sticky header, real search.
Avoid: 8.96 MB homepage, 2,637 hidden articles, pinch-zoom disabled, second slider.

### DPU — **3.6 / 5**
Take: task→system mega-menu, PDPA consent, token discipline, finder/compare interaction, compact mobile.
Avoid: zero semantic headings, no footer landmark, no search, absolute header, SPA sitemap shell.

---

## 7. RAE gap analysis (current → target)

| # | Gap | Current (measured) | Target | Severity | Effort |
|---|---|---|---|---|---|
| G-1 | Findability | no search, 16 flattened nav anchors | global search + 7-section IA + breadcrumbs | S1 | M |
| G-2 | Task orientation | first screen = 7-slide banner | 1 message + 6 task tiles + 4 priority actions | S1 | S |
| G-3 | Accessibility baseline | no `lang`, 0 landmarks, 0 `h1`, 14 contrast fails | WCAG 2.2 AA, automated + manual pass | S1 | M |
| G-4 | Trust/legality | no PDPA notice, admin link public | PDPA banner + policy pages, staff entry moved | S1 | S |
| G-5 | Mobile experience | 11,953 px, 129 px hero, no toggle | ≤ 6,500 px home, 44 px targets, real menu | S1 | M |
| G-6 | Performance | 2.78 MB, 7.6 s load, 4 embeds | ≤ 800 KB initial, LCP ≤ 2.5 s | S2 | M |
| G-7 | SEO | 404 robots/sitemap, 0 structured data, empty titles | sitemap index, schema, slug URLs | S1 | M |
| G-8 | Bilingual | `?lang=` duplication, Thai title on EN | `/en/` routes, `hreflang`, translation workflow | S2 | L |
| G-9 | Systems clarity | flat `ลิงค์อื่นๆ` list, shadow IT domains | curated directory with owner/audience/SSO | S1 | M |
| G-10 | Content lifecycle | no dates/owners on most blocks | owner + reviewed-date per page, news taxonomy | S2 | M |

## 8. Pattern adoption decisions

| Pattern | Decision | Rationale |
|---|---|---|
| P-01 audience-first nav | **Adopt** | RAE serves 6 distinct publics on one site |
| P-02 mega-menu | **Adapt** | cap at 7 sections × 6 groups × 8 links (SPU's 102 links is too many) |
| P-03 task tiles | **Adopt** | replaces slide 1–7 of the carousel |
| P-04 single-message hero | **Adopt** | removes motion, i18n and a11y debt |
| P-05 news cards | **Adapt** | keep 16:9 image + 2-line clamp, add category + BE date + reading time |
| P-06 impact strip | **Adopt, with provenance** | research KPIs need a source line per number |
| P-07 events | **Adopt later (P2)** | needs a data source (WTMS calendar) |
| P-08 FAQ + schema | **Adopt** | funding/service questions repeat |
| P-09 `hreflang` | **Adopt** | highest-ROI SEO fix for a bilingual office |
| P-10 PDPA consent | **Adopt** | MJU-wide policy alignment |
| P-11 video facade | **Adopt** | removes 4 iframes from critical path |
| P-12 systems directory | **Adopt (differentiator)** | nobody in the reference set does this well |
| P-13 org schema | **Adopt** | `GovernmentOffice` + `Organization` + `WebSite` |
| P-14 breadcrumbs | **Adopt** | RAE only has a title bar |
| P-15 sticky header | **Adapt** | sticky on scroll-up only; honour reduced motion |
| P-16 Thai search | **Adopt** | no search today |

## 9. Prioritised modernisation backlog

**P0 — release 1 (Phases 0–2)**
1. IA restructure + navigation + breadcrumbs (`G-1`)
2. Homepage rebuild: hero, 6 tiles, 4 priority actions, news/announcement split (`G-2`)
3. Accessibility baseline: `lang`, `h1`, landmarks, skip link, alt, focus, contrast tokens, 44 px targets (`G-3`)
4. Search (Thai-tolerant, pages + news + documents + experts) (`G-1`, `G-7`)
5. SEO plumbing: titles/descriptions, canonical, `hreflang`, `robots.txt`, sitemap index, `Organization`/`WebSite`/`BreadcrumbList`/`NewsArticle` (`G-7`, `G-8`)
6. PDPA notice + cookie consent; move `ผู้ดูแลระบบ` out of the public bar (`G-4`)
7. Systems directory with owner/audience/SSO state (`G-9`)
8. Fix `D-01` 404 and `D-11` duplicate labels (content fix, same day)

**P1 — release 2 (Phases 3–4)**
9. Design system tokens + component library (`G-3`, `G-5`)
10. News/announcement taxonomy + detail template with share/related (`G-10`)
11. Performance budget: image pipeline, font subsetting, video facade, caching headers (`G-6`)
12. English site parity for the top 15 pages (`G-8`)
13. Staff/researcher directory with PDPA-safe fields (`G-9`)
14. FAQ + `FAQPage`; events calendar (`P-07`, `P-08`)

**P-2 — later (quarter 2+)**
15. Content migration of the full archive + redirect map (`G-10`)
16. Analytics/KPI dashboard, search-term reporting
17. Service request forms; integration with MJU SSO for gated tools
18. Dark mode `[optional]`, print styles for documents

**Dependency notes**
- Search depends on the URL/IA decision (P0.1) and on a crawlable sitemap (P0.5).
- English parity depends on a translation workflow decision (TECHNICAL_OPTIONS §4).
- The design system must land *before* template build-out, or the CMS will re-introduce inline styles (`D-06` root cause).
- Redirect mapping depends on a full WTMS `wID` inventory `[U]` — schedule with the CMS admin export.

## 10. Acceptance criteria (shared)

| Area | Criterion | How measured |
|---|---|---|
| IA | Every legacy `wID`/`nID` URL 301s to the new URL; 0 dead links in the primary nav | link crawl + redirect table review |
| Homepage | 6 task tiles + 4 priority actions visible without scroll at 1366×768 and 390×844 | visual check |
| A11y | **0 axe-core violations of any severity** on every release candidate + a completed manual WCAG 2.2 AA checklist (incl. 2.4.11 focus not obscured, 2.5.7 dragging alternatives); `lang`, `h1`, landmarks, skip link present; contrast ≥ 4.5:1 body / 3:1 large | axe (all severities) + manual checklist + the probes in `tools/` |
| Mobile | Homepage ≤ 6,500 px at 412 px; no element < 44×44 px in primary nav; no horizontal scroll | `cdp_probe` layout + visual |
| Performance | LCP ≤ 2.5 s (4G, mid-tier Android); CLS ≤ 0.1; initial transfer ≤ 800 KB; ≤ 60 requests | Lighthouse mobile + probe |
| SEO | 100 % of top-100 pages have unique title/description, canonical, `hreflang`; sitemap index valid; Rich Results pass for `NewsArticle`/`FAQPage` | Search Console + validator |
| Content | Every page has owner + `reviewed` date; news carries category + BE date | CMS audit report |
| Bilingual | Top 15 pages have complete EN versions; no Thai-only `<title>` on `/en/` | content review |
