# TECHNICAL_OPTIONS.md

> **Status note (2026-10-24, later session):** this document belongs to the *first* phase (website audit). Its §5 recommendation to "run Option A as Phase 0 now" — i.e. refactor the live WTMS theme — is **superseded** by the later directive that the legacy WTMS site is audit evidence only and must not be modified. The current plan is `RAE_PLATFORM_ARCHITECTURE.md` / `DEVELOPMENT_ROADMAP.md`, where Phase 0 is approval-only and the legacy site stays untouched until cutover. Everything in §1–§4 and §7–§10 (capability analysis, options, effort, security controls) remains valid input.

### Architecture options, trade-offs and phased recommendation for the RAE website

**Status:** decision support only — no architecture is approved, and nothing in this document was implemented or deployed.
**Inputs:** measured platform facts in `REFERENCE_AUDIT.md §2.1`, performance data in `EVIDENCE/probe/*`, IA in `RAE_REDESIGN_BLUEPRINT.md §3`.

---

## 1. What the platform must do

| # | Capability | Why it is non-negotiable |
|---|---|---|
| C1 | Structured content types (page, news, announcement, procurement, event, document, person, system) | the homepage and 7 sections are composed from these, not from free HTML |
| C2 | Thai/English as **two locales of one record** | `hreflang` and `/en/` routing require it; today it is manual duplication (`D-14`) |
| C3 | Clean URLs + 301 redirect engine | `wID`/`nID` must die without losing traffic (`G-7`) |
| C4 | Metadata control (title, description, canonical, OG, JSON-LD) per record | today titles are empty on `wID` pages (`D-08`) |
| C5 | Search over pages, news, documents, people | no search exists (`D-02`) |
| C6 | Document library with file metadata | dozens of PDFs already linked (`Doc_2569…pdf`) |
| C7 | Directory with PDPA consent flag | staff/experts (`R7`) |
| C8 | Scheduled publishing + review reminders | `G-10`, freshness KPI |
| C9 | Design-token driven theming | prevents the inline-style regression (`D-06`) |
| C10 | Accessibility-safe component set | WCAG 2.2 AA is a release gate |
| C11 | Image pipeline (resize, AVIF/WebP, srcset) | 2.78 MB → ≤ 800 KB (`G-6`) |
| C12 | Analytics + consent gating | PDPA (`G-4`) |
| C13 | Hosting that MJU can operate | IIS today; Node requires new ops `[U]` |

---

## 2. Option A — Refactor inside the existing WTMS (ASP.NET WebForms)

**What it is:** keep `rae.mju.ac.th`, WTMS 2021 CMS, IIS; replace the theme (Bootstrap 5 + a new master page + partial views), add server-side metadata, `robots.txt`, sitemap handler, URL rewriting, and a search via SQL `LIKE`/full-text.

| Dimension | Assessment |
|---|---|
| Content migration | **none** — biggest advantage |
| Time to first release | 2–3 weeks for Phase 0 + 4–6 weeks for a theme rebuild |
| SEO ceiling | medium — `UrlRewrite` can fake slugs, but `wID` records and ViewState remain |
| Design-system fidelity | low–medium — WebForms master pages + user controls are workable, not composable |
| Accessibility ceiling | medium — you can fix markup, but you inherit table layout patterns and postbacks |
| Performance ceiling | medium — ViewState payloads, `Cache-Control: private`, no image pipeline |
| Bilingual | hard — WTMS stores separate records per language |
| Search | weak unless a separate index is added |
| Ops risk | **lowest** — same server, same backup, same skills |
| Vendor lock | high (WTMS-specific) |
| Effort | ~6–10 person-weeks |

**Use when:** the office needs a credible improvement within one quarter and cannot fund platform change, or as **Phase 0** regardless of the long-term option.

**Non-starters inside A:** rich editorial components (mega-menu data, event calendars, structured documents, faceted search) will remain hand-built HTML.

---

## 3. Option B — Headless CMS + Next.js front end (static-first)  ← **recommended**

**What it is:** content in a headless CMS (Directus / Strapi / Payload / Sanity-class), rendered by Next.js (App Router) with SSG + ISR; deployed as static/edge assets behind the existing reverse proxy, with a Node runtime only for ISR/rebuild and form endpoints. WTMS is frozen as a read-only archive during migration.

```
Editor ──> Headless CMS (content types C1–C8, locales C2, tokens C9)
                 │  webhook on publish
                 ▼
        Next.js (SSG/ISR, components, JSON-LD, sitemap, redirects)
                 │
     ┌───────────┼───────────────┬──────────────────┐
     ▼           ▼               ▼                  ▼
  CDN/edge   Image service    Search index      Analytics (consented)
  (cache)    (AVIF/WebP)      (Meilisearch/     (GA4 + consent mode)
                              Typesense/Thai analyzer)
```

| Dimension | Assessment |
|---|---|
| Content migration | required — 100–300 records estimated `[U]`; scripted import from WTMS HTML |
| Time to first release | 8–12 weeks to a public beta of 7 sections |
| SEO ceiling | **high** — real slugs, per-record metadata, sitemap index, schema, redirects |
| Design-system fidelity | **high** — tokens in one place, 34 components, visual regression tests |
| Accessibility ceiling | **high** — component-level a11y, axe-core in CI |
| Performance ceiling | **high** — HTML ≤ 100 KB, no framework JS for content pages, image pipeline, immutable caching |
| Bilingual | native (locale per record, `hreflang`, `/en/`) |
| Search | pluggable; Thai analyser available |
| Ops risk | **medium** — needs Node runtime or a static-only variant, CI/CD, backups, TLS renewal |
| Vendor lock | low (content is portable JSON/Markdown) |
| Effort | ~18–26 person-weeks incl. migration |

**Static-only variant (B2):** build on publish and serve pure static files — no Node at runtime. Removes most ops risk at the cost of rebuild latency (acceptable for a news site with 5–20 publishes/week). **Prefer B2 if MJU cannot run Node in production.**

**Non-negotiables for B:** (1) content model signed off before UI build; (2) redirect map generated from the WTMS export; (3) image pipeline from day one; (4) CI gates: axe-core, link check, Lighthouse budget, `hreflang` validation.

---

## 4. Option C — WordPress block theme (no page builder)

**What it is:** WordPress with a custom block theme (theme.json design tokens, custom blocks for news/system/document), WPML or Polylang for TH/EN, Rank Math/Yoast for metadata, Relevanssi/ElasticPress for search.

| Dimension | Assessment |
|---|---|
| Content migration | medium — HTML → blocks needs care; news import is straightforward |
| Time to first release | 6–9 weeks |
| SEO ceiling | high (mature plugin ecosystem) |
| Design-system fidelity | medium–high with `theme.json`, **low if a builder is added** |
| Accessibility ceiling | medium — depends entirely on block discipline |
| Performance ceiling | medium — plugin tax; needs strict budgets |
| Bilingual | good (WPML/Polylang) |
| Ops risk | **medium** — PHP + MySQL, plugin updates, security patching |
| Vendor lock | low |
| Effort | ~14–20 person-weeks incl. migration |

**Critical constraint:** the two WordPress references show the failure mode — SPU runs 56 stylesheets through Elementor; UTCC ships an **8.96 MB** homepage with 2,637 articles in the DOM. Option C is only acceptable as a **block theme with zero page builders and a hard performance budget**.

---

## 5. Comparison

| Criterion (weight) | A: WTMS refactor | B: Headless + Next.js | C: WordPress block theme |
|---|:--:|:--:|:--:|
| Time to first improvement (15 %) | **5** | 2 | 3 |
| Accessibility ceiling (15 %) | 3 | **5** | 3 |
| Performance ceiling (15 %) | 2 | **5** | 3 |
| IA/SEO capability (15 %) | 2 | **5** | 4 |
| Editorial UX for Thai staff (10 %) | 2 | 3 | **4** |
| Ops fit at MJU today (10 %) | **5** | 2 | 4 |
| Migration effort (10 %) | **5** | 2 | 3 |
| Long-term maintainability (10 %) | 1 | **5** | 3 |
| **Weighted score** | **3.10** | **3.75** | **3.35** |

Scoring is a judgement based on the evidence in this audit; the ops column is the only one that can flip the decision, and it depends on an answer only MJU can give `[U]`.

### Recommendation

1. **Run Option A as Phase 0 now** (2–3 weeks): close every `S1` defect that does not require a new platform — 404 link, admin link, `lang`, `h1`, meta description, canonical, `robots.txt`, sitemap, video facades, contrast tokens, redirects for the worst duplicate menu labels. This is cheap, reversible, and it buys credibility.
2. **Adopt Option B (B2 static-first if Node is not permitted) for Phases 1–3.** It is the only option that reaches the accessibility, performance and IA targets set in the blueprint.
3. **Keep Option C as a documented fallback** if MJU mandates PHP hosting and cannot support a Node/CI pipeline — but bind it to the "no page builder, theme.json tokens, performance budget" conditions in §4.

### Decision gate (needs owner input before Phase 1)

| Question | Why it decides the option |
|---|---|
| Can MJU host a Node/Next.js build pipeline (or a static build served by IIS/nginx)? | B vs C |
| Is WTMS support contract still active, and can the vendor provide a data export (`wID`, `nID`, HTML, attachments)? | migration feasibility |
| Who owns DNS/TLS/reverse proxy for `rae.mju.ac.th`? | deployment path |
| Is there a budget line for a Thai search service or can we use Postgres full-text? | search quality |
| Is English translation staffed? | `/en/` scope |
| PDPA owner for the staff/experts directory? | C7 scope |

---

## 6. Phased implementation plan (all options share Phase 0)

| Phase | Content | Duration | Deliverables | Exit gate |
|---|---|---|---|---|
| **0 — Stabilise (Option A)** | defect fixes, metadata, robots/sitemap, contrast, facade video, redirects for duplicates | 2–3 weeks | fixed live site; before/after probe reports in `EVIDENCE/` | every `S1` defect that does **not** require the new platform closed (`D-01`, `D-03`, `D-04`, `D-05`, `D-07`, `D-19`; `D-06` improved). `D-02` (search) deferred to Phase 2 |
| **1 — Foundations (Option B)** | hosting decision, CMS install, content model, design tokens, 34 components, T1–T4/T10 templates, CI (axe, links, Lighthouse budget) | 4–6 weeks | design system repo, component storybook, staging URL | a11y pass + Lighthouse budget green on staging |
| **2 — Section build (Option B)** | all 7 sections, search, systems directory, documents, events, contact | 6–8 weeks | production-ready site behind auth or `noindex` | IA walkthrough + task-based usability test (n≥10) |
| **3 — Migration (Option B)** | full `wID`/`nID` inventory, content import, redirects.csv, archive news | 6–10 weeks | live cutover plan, rollback plan | 100 % top-100 mapped; crawl diff clean; 4-week error watch |
| **4 — English parity + operate** | `/en/` for 15 pages, editorial training, review reminders, analytics dashboard, quarterly a11y audit | 4 weeks + ongoing | runbook, RACI, dashboards | `hreflang` validated; 15 EN pages live; KPIs tracked monthly |

**Parallelisable:** Phase 0 defect fixes can run while Phase 1 foundations are designed.
**Dependencies:** content inventory export (R2/R6) → migration; PDPA sign-off → directory; translator capacity → `/en/`.
**Rollback:** keep the existing site on a subdomain/`archive.` host for 12 months; DNS switch with TTL 300 during cutover; redirects reversible in one commit.

---

## 7. Security, privacy and compliance controls

| Area | Control |
|---|---|
| AuthN/AuthZ | public site has **no** login; staff tools stay on their own systems. If a gated area is added, use **documented Entra ID OIDC** only — do not replicate undocumented MJU SSO callbacks |
| Secrets | no credentials in the repo or CMS content; environment variables/secret store; no API keys in client bundles |
| PDPA | purpose limitation, minimal fields, consent for directory photos/contact, retention schedule, accessible privacy notice, consent-gated analytics (`DPU` is the model) |
| Content security | CSP (`default-src 'self'`), `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, `X-Content-Type-Options: nosniff`, frame-ancestors for embeds |
| Uploads | MIME allow-list, size limits, malware scan, no executable types, random filenames |
| Forms | server-side validation, rate limiting, honeypot/CAPTCHA only if abuse appears, no sensitive data in URLs |
| Admin | CMS admin behind SSO + IP allow-list where possible; separate subdomain; `noindex` |
| Supply chain | lockfiles, dependency audit in CI, minimal plugin set (Option C), SBOM on release |
| Monitoring | uptime, error tracking, 404/5xx reports, monthly link check, quarterly dependency patch |
| Backups | daily DB + media, 30-day retention, quarterly restore test |
| Change control | no production change without approval; no Cloudflare/DNS change outside the approved window |

---

## 8. Integration register (unchanged systems)

| Integration | Direction | Contract | Notes |
|---|---|---|---|
| ERP | outbound link | none | `ต้องเข้าสู่ระบบ` badge |
| IRB | outbound link | none | ethics guidance page explains prerequisites |
| Research DB / knowledge base / germplasm | outbound link | none | may later expose read-only JSON `[U]` |
| ThaiJO journal | outbound link | none | cite latest issue manually or via feed `[U]` |
| SSO (Entra ID OIDC) | inbound, only for gated features | documented | scope `openid profile email` |
| Search engine | internal service | REST | rebuild index on publish |
| Analytics | GA4 + consent mode | tag manager | no PII, no ad personalisation |
| Calendar | `.ics` generation | file | no Google dependency required |
| E-mail notifications | SMTP/API | internal | for form submissions only |

---

## 9. Effort and cost model (person-weeks; rates excluded)

| Work package | A | B | C |
|---|:--:|:--:|:--:|
| Discovery / content inventory | 1 | 2 | 2 |
| Design system + components | 2 | 5 | 4 |
| Templates | 2 | 4 | 3 |
| CMS/content model + editorial UX | 1 | 3 | 2 |
| Search | 1 | 2 | 1 |
| Migration + redirects | 0 | 4 | 3 |
| Accessibility & performance QA | 1 | 2 | 2 |
| Ops/CI/CD setup | 0.5 | 2 | 1 |
| **Total (person-weeks)** | **8.5** | **24** | **18** |

Add 15–20 % contingency. Hosting: A = existing IIS; B = static assets + optional Node container + search service; C = PHP/MySQL (existing MJU capability `[U]`).

---

## 10. Open questions blocking the decision

1. Acceptable hosting target and whether Node/CI is permitted `[U]`.
2. WTMS vendor cooperation for data export `[U]`.
3. Budget envelope and procurement route (in-house vs vendor) `[U]`.
4. Named content owners per section `[U]`.
5. English translation capacity `[U]`.
6. PDPA owner sign-off for the people directory `[U]`.
7. Analytics consent approach across MJU properties `[U]`.

Until 1–3 are answered, **only Phase 0 is safe to start.**
