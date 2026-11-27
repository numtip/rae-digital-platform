# ADR-0005 — Bilingual routing and content separation (TH primary, EN equivalent)

- **Status:** Proposed (owner mandate 2026-10-25)
- **Date:** 2026-10-25
- **Context docs:** `../RAE_PLATFORM_ARCHITECTURE.md` (public layer), `ADR-0002-design-baseline.md` (approved 2026-10-24), implemented in PR #16 (`1512517`) and PR #19 (`545f385`)

## Context

Phase 1 is the public website. The owner requires it to be **bilingual Thai/English from the start**, not retrofitted later:

- Thai is the primary language; English must be equivalent and independently testable.
- Copy must be separated from UI components so a CMS can replace the source later without touching components.
- Unverified content must never reach the page: no invented institutional facts, statistics, names, links or media.

The imported architecture set (`RAE_PLATFORM_ARCHITECTURE.md`, `MODULE_REQUIREMENTS_MATRIX.md`, `DEVELOPMENT_ROADMAP.md`) and ADR-0001…0004 predate this mandate and say nothing about locales, hreflang, or where copy lives. This ADR records the decision that is **already implemented and live** on the Pages preview, so the documents stop disagreeing with the code.

Two constraints frame the choice:

1. The blueprint is a **modular monolith on the Next.js App Router** (ADR-0001). A bilingual strategy must not fork into a separate static site.
2. No new dependency may be added without owner approval, and no dependency is justified for two locales.

## Decision

1. **Locale segment routing.** `/th/` and `/en/` are the only locales, implemented as `app/[locale]/…` with `generateStaticParams` over `["th","en"]` and `dynamicParams = false`; any other first segment 404s. Default locale is `th`.
2. **`/` redirects to `/th/`.** Server mode uses a 307 (`next.config.ts` `redirects()`), never 308, because the default locale may change before launch and browsers cache permanent redirects hard. Static export cannot run `redirects()`, so the preview publishes a static `/index.html` that redirects to `/th/` — the architecture does not change, only the delivery mechanism.
3. **Trailing-slash canonical form.** `trailingSlash: true`; `/th` and `/en` 301 to `/th/` and `/en/`. Every internal link uses one shape.
4. **Copy lives outside components.** `content/th/site.ts` is the **source of truth** and defines the content type (`SiteContent = typeof th`); `content/en/site.ts` is declared `SiteContent`, so a missing or extra English key fails `npm run typecheck`. Components receive copy as props and contain no user-facing strings.
5. **Missing translation is explicit, never machine-guessed.** A key with no approved source carries the literal `TODO(translate)` and is listed as a translation gap in the shift report. Never translate an office name, statistic or link freely.
6. **Official names are fixed by the owner** (2026-10-25): TH `สำนักวิจัยและบริการวิชาการ`, EN `The Office of Research and Academic Services`. The names inside `design/stitch/stitch-landing-v2.reference.html` are the prototype's wording and are **not** used.
7. **SEO is per-locale and reciprocal.** Each page emits `<html lang>`, an absolute `canonical`, and `hreflang` for `th`, `en` and `x-default`; `sitemap.xml` carries the same alternates; `robots.txt` blocks neither locale. `openGraph`/`twitter` reuse the same approved copy — no separately invented taglines.
8. **Prototype statistics are sample data, not KPIs.** The four figures transcribed from the reference are labelled in both languages as sample data pending office verification, and are never presented as organisational KPIs until the office confirms them with a source.
9. **The base URL is configuration, not a constant.** `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL`; the real domain remains `TODO(owner)`. No file hardcodes a domain.
10. **Preview hosting is not an architecture change.** GitHub Pages serves a static export (`NEXT_PAGES_PREVIEW=1` → `output: "export"` + `basePath`); the normal build keeps server features.

## Consequences

- **Every new page costs four edits**: TH copy, EN copy, the route, and the sitemap/metadata pair. A page without an approved English source cannot ship.
- The type binding makes a silent half-translation a build failure, which is the intended trade-off: slower authoring, no invisible gaps.
- `MODULE_REQUIREMENTS_MATRIX.md` and `DEVELOPMENT_ROADMAP.md` must gain a dated pointer to this ADR when the internal phases start, because per-page translation effort now scales with the module count.
- Adding a third locale later is a locale-list change, not a rewrite — but the sitemap, hreflang block and `LOCALE_LABEL` map all assume the list in `lib/i18n.ts` is the single source.
- Structured data is deliberately minimal (name, alternate name, parent organisation, URL). No `logo`, `address`, `telephone` or `sameAs` until the office supplies verified values.

## Enforcement

- `npm run typecheck` — a missing/extra English key fails the build (structural, not review-based).
- `npm run lint`, `npm run build`, `npm audit` — CI gate on every PR; the required check is `build`.
- Repository greps that must stay at zero: raw hex in `app/`/`components/` outside `app/globals.css`; `href="#"`; `cdn.tailwindcss.com`; `googleusercontent.com`; any hardcoded domain.
- Export gate in the Pages workflow: `out/th/index.html`, `out/en/index.html`, `out/index.html`, `out/sitemap.xml`, `out/robots.txt` must exist, and no forbidden external asset may appear in the export.
- Related earlier decision: ADR-0002 §Enforcement requires statistics to carry `source` + `as_of`. That schema does not exist yet; while the figures remain sample data the section label is the only guard, and the schema becomes mandatory when real figures are approved.
