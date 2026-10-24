# LEGACY_REUSE_ASSESSMENT.md
### Read-only reuse audit of `numtip/rae-nextjs` and `numtip/rae-nextjs-main`

| | |
|---|---|
| **Date** | 2026-10-24 |
| **Method** | Shallow clones into `F:\projectAi\REAenroll\_sources\`, static inspection only. No build, no install, no network calls from the code, no writes to either repository. |
| **Gate** | `RAE_ARCHITECTURE_READY_FOR_REVIEW` — see `ARCHITECTURE_QA.md` |
| **Agent Core** | **`PROJECT_ENROLLMENT_REQUIRED`** — no dedicated RAE project identity is enrolled. `agent_core_capabilities` with `project: "rae-nextjs-main"` returned: *“Project "rae-nextjs-main" has no configured Agent Core token. Configured: a different, non-RAE project identity.”* The `a different, non-RAE project identity` credential was **not** used. All findings below come from local code inspection, not from Agent Core routing. |

---

## 1. Sources and provenance

| Repo | Clone path | Commit | Commit date | Package | Stack | Size |
|---|---|---|---|---|---|---|
| `numtip/rae-nextjs-main` | `_sources/rae-nextjs-main` | `114b3b5d` | 2026-07-23 | `rae-nextjs-main@0.1.0` | Next 16.2.4 · React 19.2.4 · TS 5.9.3 · Tailwind 4.2.4 · Node ≥20 <21 | 37.8 MB |
| `numtip/rae-nextjs` | `_sources/rae-nextjs` | `805a1dea` | 2026-05-19 | `open-lovable@0.1.0` | Next 15.4.3 · React 19.1.0 · TS ^5 · Tailwind ^3.4.17 | 1.9 MB |

Both are **public** repositories (`gh repo view` → `isPrivate:false`), owner `numtip`, default branch `main`.

Composition measured in `rae-nextjs-main`: **24 `page.tsx`**, 7 `layout.tsx`, **6 `route.ts`**, 55 `.tsx` components, 24 `data/*.ts`, 24 `lib/*.ts`, 21 `src/**` files, 184 `.ts/.tsx` files total.

Composition measured in `rae-nextjs`: **4 pages** (`/`, `/builder`, `/generation`, `/rae`) and **27 API route handlers**. It is a fork of Firecrawl’s `open-lovable` AI website builder with an RAE landing page grafted on.

---

## 2. Repo A — `numtip/rae-nextjs` (legacy / not the baseline)

**Verdict: do not adopt.** It is an AI website-cloner application, not an institutional platform. 198 components, 27 unauthenticated API handlers that scrape arbitrary URLs, call paid LLM providers and execute commands in Vercel/E2B sandboxes. Shipping any of that into a government deployment would be a security incident.

| Asset | Path | Classification | Why |
|---|---|---|---|
| Governance specs (8 docs) | `docs/governance/**` | **REUSE** (as policy reference) | Bilingual, media, motion, AI-asset and technical policies are vendor-neutral and better than anything in the main repo |
| Design-token CSS | `styles/design-system/colors.css` | **REUSE** (as reference only) | Declares the canonical `#005C3B` / `#FFDE00` pair with AA notes |
| Token governance | `docs/governance/design/DESIGN_TOKEN_SYSTEM_V1.md` | **REUSE** (as policy) | “No raw hex outside tokens”, AA 4.5:1 rule |
| shadcn/Radix primitives (33) | `components/ui/shadcn/*.tsx` | **ADAPT** | Standard, but built for Tailwind 3 + Radix; main repo is Tailwind 4 |
| RAE bilingual copy | `components/rae/data/content.{th,en}.ts` | **ADAPT** (as migration data) | ~250 keys of real RAE copy; re-key into a typed schema |
| RAE sections (11) | `components/rae/sections/*` | **EXCLUDE** | Hardcodes `#00b4a6` / `#0a1628`, violating the repo’s own token rule; links to routes that do not exist |
| RAE media (9 SVG) | `public/rae-assets/**` | **ADAPT** | Placeholder grade |
| Language hook | `components/rae/hooks/useLanguage.tsx` | **EXCLUDE** | Client-only `localStorage`, no SSR locale; superseded by route-based i18n |
| SEO | — | **ABSENT** | No `sitemap.ts`, `robots.ts`, `hreflang`, per-page metadata |
| Content model | — | **ABSENT** | `types/*` are sandbox/conversation types only |
| Document Center | — | **ABSENT** | No match for “Document Center” anywhere |
| Auth / SSO / M365 | — | **ABSENT** | No `next-auth`, `@azure/msal`, `jose`, `middleware.ts`, no Graph/SharePoint code |
| Database | — | **ABSENT** | No Prisma/Drizzle/mysql/mssql client |
| Tests / CI | `package.json:11-13` → `tests/*.js` | **EXCLUDE** | Referenced test files do not exist; no `.github/` |
| Sandbox / AI layers | `lib/sandbox/**`, `lib/ai/**`, `app/api/**` | **EXCLUDE** | Out of institutional scope, high blast radius |
| Triple lockfiles | `package-lock.json`, `pnpm-lock.yaml`, `bun.lock` | **EXCLUDE** | Non-reproducible toolchain |

**Take from repo A:** the 8 governance documents, the token-policy idea, and the bilingual copy as source text. Nothing else.

---

## 3. Repo B — `numtip/rae-nextjs-main` (the actual baseline)

### 3.1 Design system & tokens

| Asset | Path | Class | Evidence |
|---|---|---|---|
| Institutional token layer | `app/tokens.css` | **REUSE (authoritative)** | `@theme` block: `--color-maejo-green:#005c3b`, `-strong:#004a2f`, `-muted:#0a7a52`, `-light:#e8f5ef`, `--color-maejo-gold:#ffde00`, `-dark:#e6c800`; neutrals `#4c4c4c`/`#0f1f18`/`#d4e0da`/`#b8cfc4`; `--spacing-container-max:68.75rem`; radius 8/12/16/full; green-tinted shadows; `--header-height:4.5rem`; `--nav-touch-min:2.75rem`; `--content-line-height-th:1.75` |
| Stitch V2 brand tokens | `app/stitch-landing-v2/stitch-landing.css` | **ADAPT (conflicts — see §5.1)** | `--color-brand-primary:#005c3b`, `-dark:#003f2a`, `-forest:#014d35`, `--color-brand-gold:#d8a01a`, `-goldhover:#c79318`, `-ivory:#f7f3ea`, `--font-sans:"Sarabun"`; utilities `.shadow-soft`, `.card-hover` (translateY −5px / 300 ms), `.scrollbar-hide` |
| Stitch V2 components (10) | `components/stitch-landing-v2/*` | **REUSE (visual) / REBUILD (wiring)** | `HeroSection`, `ServiceCards`, `ResearchInnovationSection`, `StatisticsSection`, `ContentSection`, `KnowledgeResources`, `PartnersSection`, `SiteFooter`, `LocaleSwitcher`, `StitchLandingRenderer` |
| Hero | `components/stitch-landing-v2/HeroSection.tsx` | **REUSE visual, ADAPT a11y** | `min-h-[600px]`, image + `from-brand-dark/90 … to-transparent` gradient, H1 with gold-accented phrase, two CTAs (green + gold). Gold CTA is white-on-`#D8A01A` = **2.34:1 → fails WCAG AA** |
| Home section primitives | `components/home/*` (Hero variants A/B/C, `KpiImpactStrip`, `NewsHighlights`, `QuickLinks`, `ServicesOverview`, `GreenOfficeSection`, `HomeSectionRenderer`) | **ADAPT** | Variant-switchable hero and a section renderer are a good composition pattern |
| Layout primitives | `components/layout/*` (`SiteShell`, `PageContainer`), `components/navigation/*` (`SiteHeader`, `MainNav`, `MobileNav`, `NavItem`) | **REUSE** | Real nav components with locale-aware links — unlike Stitch V2 whose links are all `href:"#"` |
| Icons | `components/stitch-landing-v2/icons/index.tsx` | **REUSE** | Small inline SVG set (`SearchIcon`, `HamburgerIcon`, `ArrowIcon`) |

### 3.2 Layout, navigation, i18n, SEO

| Asset | Path | Class | Evidence |
|---|---|---|---|
| Locale routing | `app/[locale]/**`, `lib/locale.ts`, `lib/paths.ts` | **REUSE** | `th` default + `en`; `isLocale()` guard; `withLocale()` path helper; no middleware |
| Navigation taxonomy | `data/navigation.ts` | **ADAPT** | 10 items with `primary/secondary/utility` groups and bilingual labels — good shape, wrong section set for the new IA |
| SEO builder | `lib/seo.ts` | **REUSE** | `buildPageMetadata()` emits canonical + `languages {th, en, x-default}` + OG `alternateLocale` + Twitter card; `clipMetaDescription()` at 155 chars |
| Sitemap | `app/sitemap.ts` | **ADAPT** | Loops locales × 9 static segments + news slugs; excludes `/search/`; **omits `/documents/`** |
| Robots | `app/robots.ts` | **REUSE** | Metadata route |
| `html lang` | `app/[locale]/layout.tsx:39` → `<div lang={locale}>` | **REBUILD** | Sets `lang` on a `<div>`, not `<html>`. `components/HtmlLang.tsx` is **ABSENT** despite being listed in `PROJECT_STRUCTURE.md`. This is the same defect class the WTMS audit found (`D-04`) |
| Site origin / prefix | `lib/site.ts`, `lib/assetPath.ts`, `lib/asset-path.ts` | **ADAPT** | `NEXT_PUBLIC_SITE_ORIGIN` + `NEXT_PUBLIC_SITE_PATH_PREFIX` + asset prefix. Two near-duplicate helpers exist (`assetPath.ts` and `asset-path.ts`) |
| Org naming | `lib/org-names.ts` | **REUSE** | Official bilingual org names in one place |
| Stitch V2 locale wiring | `app/stitch-landing-v2/page.tsx` (hardcoded `locale="th"`), `app/en/stitch-landing-v2/page.tsx` | **REBUILD** | Parallel hand-made routes instead of `[locale]` param |

### 3.3 Content model & data

| Asset | Path | Class | Evidence |
|---|---|---|---|
| Content types | `data/content-models.ts` | **ADAPT** | `NewsRecord`, `DocumentRecord`, `ServiceRecord`, `PersonnelRecord` each with an optional `translation_en` block; flat, non-relational, no IDs/status/workflow |
| News registry | `data/news-registry.ts` | **ADAPT** | 12.9 KB typed records + `publishedNewsIndices()` + slug helper |
| Services registries | `data/academic-services-registry.ts`, `data/research-services-registry.ts` | **REUSE (as migration data)** | Real service catalogue with steps and contact points |
| Personnel registry | `data/personnel-registry.ts` | **ADAPT** | Leadership + unit contacts; no roles/permissions, no PDPA flags |
| Page copy | `data/pages.ts` (14.7 KB) | **ADAPT** | Title/lead/bullets per inner page |
| Home sections | `data/home-sections.ts`, `data/hero.ts`, `data/quickLinks.ts`, `data/servicesOverview.ts`, `data/cta.ts`, `data/footer.ts`, `data/brand.ts` | **REUSE (copy)** | Bilingual strings ready to migrate into the CMS seed |
| KPI strip | `data/kpiImpact.ts`, `data/kpiSnapshot.json` | **EXCLUDE** | Self-declared `source:"placeholder"`, `status:"pending-live-source"` |
| i18n localisers | `lib/news-i18n.ts`, `documents-i18n.ts`, `services-i18n.ts`, `personnel-i18n.ts` | **REUSE pattern** | `localizeX(record, locale)` with Thai fallback — becomes a DB-level fallback rule |
| Search corpus | `data/search-corpus.ts` + `components/SiteSearch.tsx` | **ADAPT** | Client-side array search over static content; replaced by MySQL full-text at scale (keep the UI) |

### 3.4 Document Center (the most reusable subsystem)

| Asset | Path | Class | Evidence |
|---|---|---|---|
| Taxonomy | `docs/document-center/taxonomy.json` | **REUSE** | v1.0.0, 2026-06-17: 6 categories, Thai numbered folders `01-…`–`06-…`, `owner_group`, `sort_order`, `enabled` |
| Record types | `src/features/document-center/types.ts` | **ADAPT** | `DocumentStatus` current/obsolete/archived/draft; `DocumentVisibility` public/internal/restricted; `DocumentRecord{id,category,owner,file_type,status,updated_date,onedrive_path,storage_url,tags,version,visibility,note}`; `ID_PATTERN /^RAE-DC-\d{4}$/` |
| Registry data | `src/features/document-center/registry/*.json` | **ADAPT** | 11 records, all `category:"admin"`, all with `maejo365-my.sharepoint.com` URLs |
| UI components | `src/features/document-center/components/*` (7) | **REUSE** | `DocumentCard`, `DocumentCategoryCard`, `DocumentBadge`, `DocumentHero`, `DocumentKpiStrip`, `DocumentSearchBox`, `DocumentSearchResults` |
| Search | `documents/search/page.tsx` + `DocumentSearchResults.tsx` | **ADAPT** | Query-string state + `Suspense`, static-export safe; **no pagination** |
| Category/detail routes | `app/[locale]/(site)/documents/{category/[slug],document/[id]}` | **ADAPT** | `generateStaticParams` per locale |
| Validation script | `scripts/validate-document-registry-partial.mjs` | **ADAPT** | Asserts 11 entries, unique IDs/URLs, host must be `maejo365-my.sharepoint.com`. Hardcodes `ROOT="G:/ProjectAI/rae-nextjs-main"`; **not wired to any npm script** |
| Storage policy | all records → `storage_url` on SharePoint | **REUSE (policy)** | “Website is a Document Registry, not a DMS; master files live in M365” (`docs/kb-content-bridge/STITCH_LANDING_REDESIGN_BRIEF.md` §9) |

Two parallel document systems exist: legacy `data/documents.ts` + `components/DocumentRegistry.tsx` at `/[locale]/forms-documents/` (5 PDFs in `public/documents/`), and the newer `/[locale]/documents/`. **The new center is orphaned** — absent from `data/navigation.ts:19` and from `app/sitemap.ts`.

### 3.5 Research portal, API layer, database

| Asset | Path | Class | Evidence |
|---|---|---|---|
| Route handlers (6) | `app/api/research/{projects,filters,budget/stats,stats/{overview,budget,portfolio}}/route.ts` | **EXCLUDE** | All six are `dynamic="force-static"`; **five** parse `request.url.searchParams` (`filters` returns static options only). Under `output:"export"` there is no server to answer any of them. Repo’s own `docs/reports/PREVIEW_PLATFORM_REPORT.md:97` confirms dynamic API routes are excluded from the static export |
| Dashboards | `app/dashboard/**`, `app/research/**`, `components/research/**` (12) | **EXCLUDE** | No layout, no metadata, no `noindex`, no nav link; fetch the non-functional API; CSV source `data/research/a3.csv` is gitignored and absent |
| API contracts | `docs/RESEARCH_API_SPEC.md`, `docs/contracts/*` (7 files) | **ADAPT (as spec only)** | Pagination, filter param names, error envelope, `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`, `X-API-Version: 1.0` |
| Read-only SQL snapshot | `lib/connectors/rdcSqlConnector.ts` + `scripts/export-rdc-budget.ts` | **ADAPT (ETL pattern)** | `mssql` used **only** by a build-time script (`npm run rdc:export`), never at request time. Connector settings come from environment variables (**names and host redacted**); credentials from a repository secret in a scheduled snapshot workflow; the query is read-only against an internal view (name redacted); a privacy gate rejects `personName`/unmasked `personCode` |
| SQL folder | `sql/{01_columns,02_sample,SQLQuery1}.sql` | **EXCLUDE** | Discovery notes, 967 bytes total |

### 3.6 Tests, CI, deployment

| Asset | Path | Class | Evidence |
|---|---|---|---|
| Test suite | `__tests__/*.ts` (7 files, ~99 KB) + `src/__tests__/**` | **ADAPT** | Run via `tsx`, not Jest/Vitest: `budget-stats`, `portfolio-stats`, `rdc-*`, `data-quality-audit`, `full-dataset-validation`, `smoke`. Good dataset-validation discipline to carry over |
| KPI schema validation | `scripts/validate-kpi-snapshot.ts` (+ `kpiSnapshot.schema.json`), `prebuild` hook | **REUSE pattern** | Schema-validate generated data at build; build must never fail on a missing upstream |
| GitHub Pages deploy | `.github/workflows/pages.yml` | **ADAPT** | Node 20, `NEXT_PUBLIC_*` build metadata, deploy `out/` |
| RDC snapshot cron | `a scheduled snapshot workflow` | **DEFER** | Scheduled DB extraction with a scoped secret; useful pattern, not needed in v1 |
| Deploy policy docs | `DEPLOYMENT.md`, `VPS_ORGANIZATION_PLAN.md`, `ARCHITECTURE.md` | **REUSE (policy)** | Staging diff before switch; never overwrite live; nginx changes require approval; Node ≥20 <21 |

---

## 4. Documentation assets (from `docs/`)

| Spec | Path | Status | Adopt |
|---|---|---|---|
| Landing Design Freeze V2 | `docs/design-freeze-v2/Landing_Design_Freeze_V2.md` | Draft — planning only | ADAPT |
| ST2 freeze report | `docs/design-freeze-v2/ST2_DESIGN_FREEZE_REPORT.md` | Complete (docs only) | ADAPT |
| Stitch V2 implementation report | `docs/design-freeze-v2/STITCH_LANDING_V2_IMPLEMENTATION_REPORT.md` | ~96 % parity, blockers open | ADAPT |
| Stitch implementation audit | `docs/design-freeze-v2/STITCH_IMPLEMENTATION_AUDIT.md` | Audit only | ADAPT |
| Brand system | `docs/design-system/BRAND_SYSTEM.md` | Canonical | **REUSE** |
| Design system | `docs/architecture/DESIGN_SYSTEM.md` | Canonical (RC5.5) | **REUSE** |
| RC6 readiness checklist | `docs/design-system/RC6_READINESS_CHECKLIST.md` | Active, 10 gates | **REUSE** |
| Homepage IA / visual system | `docs/architecture/HOMEPAGE_IA.md`, `HOMEPAGE_VISUAL_SYSTEM.md` | Active | ADAPT |
| Visual governance | `docs/architecture/VISUAL_GOVERNANCE.md` | Active | **REUSE** |
| Motion gate | `docs/governance/MOTION_PRODUCTION_GATE.md` | Active | **REUSE** |
| Asset governance | `docs/creative/ASSET_GOVERNANCE.md`, `IMAGE_LANGUAGE_SYSTEM.md` | Active | **REUSE** |
| RDC snapshot policy | `docs/governance/RDC_SNAPSHOT_POLICY.md` | Active | **REUSE** |
| Test policy | `docs/governance/TEST_POLICY.md` | Active | ADAPT |
| Preview platform report | `docs/reports/PREVIEW_PLATFORM_REPORT.md` | Report | **REUSE (constraints)** |
| Deploy readiness audit | `docs/reports/DEPLOY_READINESS_AUDIT.md` | Report | **REUSE (constraints)** |

**Documentation gaps that the new platform must fill:** no ADR directory (`docs/DECISIONS_LOG.md` referenced but absent), no authentication/RBAC design, no OpenAPI/JSON Schema, no PDPA policy, no retention policy, no bilingual document metadata, no full accessibility audit, no performance budget, no analytics spec.

---

## 5. Conflicts found (must be resolved, not silently merged)

### 5.1 Brand palette — three values for the same brand

| Source | Green | Gold | Body font |
|---|---|---|---|
| `app/tokens.css` | `#005C3B` | `#FFDE00` | Inter → `Noto Sans Thai` fallback |
| `app/stitch-landing-v2/stitch-landing.css` | `#005C3B` / dark `#003F2A` | `#D8A01A` | Sarabun |
| Legacy WTMS site (audit evidence) | `#017F3F` | — | `myFont` + Sarabun |

Measured contrast (`tools/contrast_stitch.py`, output in `EVIDENCE/notes/contrast_stitch_tokens.txt`):
`white on #005C3B` **8.10** ✅ · `#FFDE00 on #005C3B` **6.05** ✅ · `#FFDE00 on white` **1.34** ❌ · `white on #D8A01A` **2.34** ❌ · `#003F2A on #D8A01A` **5.14** ✅ · `#6B7280 on white` **4.83** ✅ · `#9CA3AF on white` **2.54** ❌.

**Decision (detail in `DESIGN_SYSTEM_RECONCILIATION.md`):** `#005C3B` is the single canonical green (three sources agree); `#D8A01A` is the UI gold; `#FFDE00` is restricted to text/graphics **on dark green only**; `#017F3F` is retired from the web platform and retained only in the legacy audit as evidence.

### 5.2 Stitch V2 vs Stitch V6

`docs/design-freeze-v2/STITCH_IMPLEMENTATION_AUDIT.md` records that “Stitch V6 supersedes Stitch V2 as production candidate”, and `docs/reports/RC7_LANDING_V6_QA_REPORT.md` locks Landing V6. This task’s directive names **Stitch Landing V2** as the primary baseline. **Resolution:** V2 is the design baseline for the new platform (per directive); V6 remains in the repo as a frozen alternative and is not deleted. The two differ in layout, so any V6-only section is treated as optional. Flagged as approval item **A-2**.

### 5.3 Static export vs server requirements

`next.config.ts` sets `output:"export"`; `ARCHITECTURE.md` describes nginx serving prebuilt files; yet the repo contains 6 API route handlers, a dashboard and an admin-less portal. Those cannot work. **Resolution:** the new platform is explicitly a **Node-runtime** application (Option 1 in `RAE_PLATFORM_ARCHITECTURE.md`). The existing static pipeline stays live, untouched, until cutover.

### 5.4 Stitch V2 is a visual shell, not a site

Every navigation link, CTA, login link, locale switch and social link in `content/stitch-landing.ts` is `href: "#"`. The header search field has no form, no name and no handler — it is decorative. **Resolution:** reuse the visual layer; rebuild all navigation, routing and search. This is the single most important reuse caveat.

### 5.5 Document ID scheme mismatch

`types.ts` declares `ID_PATTERN /^RAE-DC-\d{4}$/` but the actual registry IDs are `WTMS1920-001`. **Resolution:** new platform uses its own immutable code `RAE-DC-####`, with `legacy_code` kept as a nullable column for traceability.

### 5.6 Accessibility defects inherited from the baseline

| Defect | Evidence | Consequence |
|---|---|---|
| `lang` set on `<div>`, not `<html>` | `app/[locale]/layout.tsx:39` | screen readers/TTS mispronounce Thai |
| Gold CTA white-on-gold 2.34:1 | `HeroSection.tsx:47-50` | WCAG 1.4.3 failure |
| Placeholder `#9CA3AF` 2.54:1 | Stitch token | WCAG 1.4.3 failure on form hints |
| Border `#E5E7EB` / `#D4E0DA` ≈ 1.2–1.35:1 | both token files | input boundaries below the 3:1 UI minimum |
| Mobile menu has no focus trap / `aria-expanded` | `StitchLandingRenderer.tsx:106-150` | keyboard users escape into the page behind |
| Search input with no action | `StitchLandingRenderer.tsx:92-104` | dead affordance |
| Statistics hardcoded, self-flagged `NEEDS_VERIFICATION` | `content/stitch-landing.ts:1-10` | publishable unverified numbers |

All of these are fixed in the reconciled design system, not carried forward.

### 5.7 Third design source: `StitchCode.MD` prototype

`StitchCode.MD` (added to the workspace during this session) is the original single-file Stitch page — Tailwind CDN, `<html lang="th">`, Sarabun from Google Fonts — from which `content/stitch-landing.ts` was derived. It is a **design reference, not application code**: 43 `href="#"`, a CDN Tailwind build, and the RAE logo hosted on `lh3.googleusercontent.com`.

It is nonetheless the authority for *visual intent*, and it differs from the React port in three ways that must be decided rather than merged:

| Aspect | Prototype | React port | Decision |
|---|---|---|---|
| Header | dark (`bg-brand-dark`) | white with utility strip | **white** — matches the three reference universities and gives a stronger base for the gold active underline; the dark tone survives in the hero/band treatment |
| Sections | 7 | 8 (adds `ResearchInnovationSection`) | **8** — research is core to RAE’s mandate |
| Heading semantics | logo is `<h1>`, hero headline is `<h2>` | hero headline is `<h1>`, logo is `<span>` | **React version** (one `h1`, correct outline) |

Full rationale in `DESIGN_SYSTEM_RECONCILIATION.md` conflicts **C-15…C-17**.

---

## 6. Adoption plan — what actually enters the new repository

| # | Item | Source | How it enters | Effort |
|---|---|---|---|---|
| 1 | Token layer | `app/tokens.css` + Stitch brand tokens | Copy, then rewrite as `src/styles/tokens.css` with resolved values (§5.1) | S |
| 2 | Stitch V2 section components (8) | `components/stitch-landing-v2/*` | Port to `src/modules/content/ui/*`, replace `href:"#"` with typed route objects, fix a11y | M |
| 3 | Navigation components | `components/navigation/*` | Port to `src/shared/ui/nav/*` | S |
| 4 | SEO builder | `lib/seo.ts` | Copy nearly verbatim; add JSON-LD emitters | S |
| 5 | Locale plumbing | `lib/{locale,paths,site,org-names}.ts` | Port; add `<html lang>` fix | S |
| 6 | Document Center | `src/features/document-center/**` + `docs/document-center/taxonomy.json` | Port UI; replace static registry with DB-backed repository; keep the `visibility` model | M |
| 7 | Content copy | `data/*.ts`, `components/rae/data/content.*.ts` | Transform into seed fixtures for the CMS migration | M |
| 8 | Content types | `data/content-models.ts` | Superseded by the relational schema in `DATABASE_AND_API_BLUEPRINT.md`; used only to map legacy fields | S |
| 9 | Governance policies | `docs/governance/**`, `docs/architecture/VISUAL_GOVERNANCE.md`, `ASSET_GOVERNANCE.md`, `MOTION_PRODUCTION_GATE.md` | Copy into `docs/policy/` and enforce in CI where possible | S |
| 10 | Build-time validation pattern | `scripts/validate-kpi-snapshot.ts`, `validate-document-registry-partial.mjs` | Rewrite as unit tests + zod schema checks | S |
| 11 | API contract conventions | `docs/contracts/*`, `docs/RESEARCH_API_SPEC.md` | Convert to OpenAPI 3.1 (auth added — originals are unauthenticated) | M |
| 12 | RDC ETL connector | `lib/connectors/rdcSqlConnector.ts` | Adapt into a scheduled, read-only ETL job; never a request-path DB | M |

**Not entering the new repository:** `app/api/**` from either repo, `lib/sandbox/**`, `lib/ai/**`, all `app/dashboard|research` scaffolds, GitHub Pages workflow as production deploy, `open-lovable` package scaffolding, `_recovered-dev-scaffold`, `_extract-from-maps.mjs`, triple lockfiles.

---

## 7. Verification log

| Check | Command | Result |
|---|---|---|
| Repo visibility & metadata | `gh repo view numtip/rae-nextjs-main --json …` | public, default `main`, pushed 2026-07-23 |
| Clone integrity | `git log -1 --format="%H %ad %s"` | `114b3b5d…` / `805a1dea…` as tabulated |
| Route/component counts | `Get-ChildItem … -Filter page.tsx` etc. | 24 pages / 7 layouts / 6 route handlers / 55 tsx |
| `output` mode | read `next.config.ts` | `output:"export"`, optional `basePath` for GitHub Pages |
| `mssql` usage | repo-wide search | 1 file (`lib/connectors/rdcSqlConnector.ts`), build-script only |
| Search for auth/Graph | repo-wide | ABSENT in both repos |
| Contrast | `python tools/contrast_stitch.py` | output stored in `EVIDENCE/notes/contrast_stitch_tokens.txt` |
| Stitch link wiring | `Select-String content\stitch-landing.ts 'href: "'` | ≥ 20 distinct `href:"#"` occurrences |

---

## 8. Bottom line

The reusable value sits almost entirely in **`rae-nextjs-main`**: a working Tailwind 4 token layer, ten Stitch V2 section components, locale/SEO helpers, a typed content-registry pattern, and a Document Center whose data model and visibility rules are worth keeping. Roughly **12 assets** are worth porting (≈ 4 S-effort, 5 M-effort, 3 policy copies); everything else is either a visual shell with dead links, a non-functional static-export API, or an AI sandbox that must not ship. `rae-nextjs` contributes only governance documents and copy.
