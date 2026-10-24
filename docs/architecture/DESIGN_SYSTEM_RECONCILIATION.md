# DESIGN_SYSTEM_RECONCILIATION.md
### Reconciling Stitch Landing V2, the institutional token layer, the legacy site, and the new admin UI

| | |
|---|---|
| **Date** | 2026-10-24 |
| **Primary baseline** | **Stitch Landing V2** (`components/stitch-landing-v2/*`, `app/stitch-landing-v2/stitch-landing.css`) — per directive |
| **Secondary** | `app/tokens.css` (institutional layer), `docs/design-system/BRAND_SYSTEM.md` |
| **Audit-only** | Legacy WTMS site (`#017F3F`, Bootstrap hue set) — evidence, not a design source |
| **Contrast tooling** | `tools/contrast_stitch.py`, `tools/contrast_reconcile.py`; outputs in `EVIDENCE/notes/contrast_stitch_tokens.txt` and `contrast_reconciliation.txt` |

---

## 1. Sources inspected

| Source | Path | What it declares |
|---|---|---|
| **Stitch prototype (design intent)** | `StitchCode.MD` (single-file Tailwind page, `<html lang="th">`) | **dark** `bg-brand-dark` sticky header, 600 px hero, ivory services card overlapping the hero (`-mt-10`), dark-forest stats band, 7 sections, Sarabun via Google Fonts, 43 `href="#"` |
| Stitch V2 stylesheet | `app/stitch-landing-v2/stitch-landing.css` | green `#005C3B`, dark `#003F2A`, forest `#014D35`, gold `#D8A01A`, gold-hover `#C79318`, ivory `#F7F3EA`, light `#F8F9FA`; Sarabun; stitch text `#1F2937`/muted `#6B7280`/border `#E5E7EB`/placeholder `#9CA3AF`; utilities `.shadow-soft`, `.card-hover`, `.scrollbar-hide` |
| Institutional tokens | `app/tokens.css` | `--color-maejo-green:#005c3b`, `-strong:#004a2f`, `-muted:#0a7a52`, `-light:#e8f5ef`, `--color-maejo-gold:#ffde00`, `-dark:#e6c800`; neutrals `#4c4c4c`/`#0f1f18`/`#d4e0da`/`#b8cfc4`; `--spacing-container-max:68.75rem`; radius 0.5/0.75/1 rem; green-tinted shadows; breakpoints 40/48/64 rem; `--header-height:4.5rem`; `--nav-touch-min:2.75rem`; line-height 1.65 / 1.75 (Thai) |
| Brand system doc | `docs/design-system/BRAND_SYSTEM.md` | Green 50–900 ramp, warm neutrals, CTA colour matrix, radius/shadow scale |
| Design system doc | `docs/architecture/DESIGN_SYSTEM.md` (RC5.5) | Token rules, Thai-first line-height, no raw hex |
| Visual governance | `docs/architecture/VISUAL_GOVERNANCE.md` | Brand primaries locked, no new hues, no hard-coded hex outside tokens |
| Image / asset / motion policy | `docs/creative/IMAGE_LANGUAGE_SYSTEM.md`, `ASSET_GOVERNANCE.md`, `docs/governance/MOTION_PRODUCTION_GATE.md` | WebP primary, size caps, alt Thai-first; approved-asset workflow; motion allow-list |
| Legacy evidence | `REFERENCE_AUDIT.md §2.4` | `#017F3F` brand + 6 unrelated Bootstrap hues; 11 font sizes; 14 contrast failures |

---

## 2. Conflict register

| # | Conflict | Evidence | Decision |
|---|---|---|---|
| **C-1** | Two different golds | `#FFDE00` in `tokens.css`; `#D8A01A` in Stitch V2 | **Two tokens, two purposes** (see §4.1): `--gold` `#D8A01A` for UI surfaces/accents; `--gold-institutional` `#FFDE00` only for text/marks **on dark green**. `#FFDE00` on white is **1.34:1** and is banned as a text colour |
| **C-2** | Three greens | `#005C3B` (both repos), `#017F3F` (legacy) | **`#005C3B` is canonical.** `#017F3F` is retired from the platform; it survives only in the audit as evidence and in any legacy print artefact |
| **C-3** | Body font | tokens.css → Inter + Noto Sans Thai; Stitch → Sarabun | **Sarabun is canonical** (Stitch baseline, already used across MJU). Inter is removed from the critical path; `Noto Sans Thai` stays as fallback only. Saves one font request |
| **C-4** | Gold CTA fails contrast | `HeroSection.tsx:47-50` — `text-white` on `bg-brand-gold` = **2.34:1** | **Gold CTA text becomes `#003F2A` (5.14:1)**. White-on-gold is prohibited |
| **C-5** | Focus ring colour | Stitch: `focus:ring-brand-gold` (2.34:1 on white) vs `VISUAL_GOVERNANCE.md` (gold) vs `DESIGN_GOVERNANCE.md` (`#79C2A7`) | **Focus ring = `#0A7A52` (5.36:1 on white) with 2 px offset; on dark surfaces `#FFDE00` (6.05–9.0)**. Gold is not a focus colour on light backgrounds |
| **C-6** | Muted text on ivory | `#6B7280` on `#F7F3EA` = **4.37:1** (fails AA normal text) | On ivory use `#5B6470` (**5.42:1**); `#6B7280` allowed on white (4.83) only |
| **C-7** | Input borders below 3:1 | `#E5E7EB` = 1.24, `#D4E0DA` = 1.36, `#9CA3AF` = 2.54 | **Form/UI borders = `#8A94A3` (3.07:1)**; the pale greys become decorative dividers only |
| **C-8** | Placeholder text | `#9CA3AF` = 2.54 | Placeholder = `#6B7280` (4.83) and never the only label |
| **C-9** | Two 8-pt scales-ish | tokens.css `--spacing-section:1.375rem`; Tailwind scale; Stitch arbitrary values (`min-h-[600px]`, `py-3`, `gap-6`) | **One 4-pt scale** with named steps (§4.3); arbitrary pixel values banned in new code |
| **C-10** | Breakpoints | tokens.css 40/48/64 rem; Stitch `lg`/`md`; legacy 576–1400 | **Six breakpoints**: 360, 480, 768, 1024, 1280, 1536 px |
| **C-11** | Dark mode | `exitfull.txt` requires it; Stitch V2 has none | **Admin: dark mode required. Public: optional (deferred)**. Tokens defined for both from day one |
| **C-12** | Asset naming | `rae-{section}-{subject}-{variant}-{width}w` vs `rae-{section}-{asset-type}-{variant}-{yyyymmdd}` | Adopt the **first** (width-suffixed, CDN/responsive friendly); record in `docs/policy/ASSET_GOVERNANCE.md` |
| **C-13** | Gold hover darkens | Stitch `--color-brand-goldhover:#C79318`; `#003F2A` text on it is **4.37:1** (below AA normal) | **Hover lightens to `#E3AF2F`** (5.98:1 with `#003F2A`). Darkening a gold CTA whose label is dark ink is the wrong direction |
| **C-14** | Prior token system | `RAE_REDESIGN_BLUEPRINT.md §7.1` proposed `#017F3F` / `#0A8F45`; this phase establishes `#005C3B` | **This document supersedes that section.** `#017F3F` and `#0A8F45` are retired; where any document disagrees with §4, §4 wins |
| **C-15** | Header colour drift | Prototype `StitchCode.MD` uses a **dark** header (`bg-brand-dark`); the React port (`StitchLandingRenderer.tsx`) uses a **white** header with a utility strip | **Keep the React white header** for the new site: it matches the reference sites’ institutional pattern (SPU/UTCC/DPU all use light chrome) and gives a stronger contrast base for the gold active underline. The prototype’s dark header survives as the hero/band treatment (`--brand-900`). Recorded as a deliberate deviation from the generated design |
| **C-16** | External, ephemeral image hosts | Prototype loads the RAE logo from `lh3.googleusercontent.com/aida-public/…` | **All brand assets must be local** (`/public/images/…`), versioned, with a licence note. External Google-hosted URLs are not permitted in production |
| **C-17** | Section set drift | Prototype: 7 sections (header, hero, services, stats, content, resources, partners, footer). React: adds `ResearchInnovationSection` | **Keep 8** — the research/innovation block is required by RAE’s mandate and is CMS-driven. Prototype remains the layout authority for the other seven |

---

## 3. Resolution principles

1. **Preserve identity, fix legality.** Colour, layout rhythm, hero composition and card language stay as Stitch V2 designed them. Any change below is a contrast or semantics fix, not a restyle.
2. **One value per role.** A colour role has exactly one hex per theme. No “close enough” variants.
3. **Tokens are the only API.** Components consume semantic tokens (`--surface`, `--text`, `--brand`), never a raw hex or a Tailwind palette class like `text-gray-700`.
4. **Thai first.** Line-height 1.75 for Thai body; no italics; no uppercase transforms; no letter-spacing on Thai.
5. **Every ratio is computed, not estimated.** `tools/contrast_*.py` produce the values quoted here.

---

## 4. Canonical token set

### 4.1 Colour (light theme)

| Token | Hex | Role | Measured proof |
|---|---|---|---|
| `--brand` | `= --brand-700` | semantic alias used by components | inherits **8.10:1** |
| `--brand-900` | `#003F2A` | hero overlay, dark bands, text on gold | white **12.04:1**; `#D8A01A` text **5.14:1** |
| `--brand-800` | `#014D35` | buttons hover, deep accent | white **9.93:1** |
| `--brand-700` | `#005C3B` | **primary brand** — header, links, primary button | white **8.10:1** |
| `--brand-600` | `#0A7A52` | focus ring, secondary hover | white **5.36:1** |
| `--brand-100` | `#E8F5EF` | tint backgrounds, chips | `#005C3B` text **7.22:1** |
| `--gold` | `#D8A01A` | accent surfaces, active underline, stat marks | `#003F2A` text **5.14:1**; **not** for text on white |
| `--gold-hover` | `#E3AF2F` | hover of gold surfaces (lightens, keeps dark text legible) | `#003F2A` text **5.98:1** |
| `--gold-institutional` | `#FFDE00` | institutional mark / headline accent **on dark only** | on `#005C3B` **6.05:1**; on `#003F2A` **9.00:1**; on white **1.34:1 → banned** |
| `--ivory` | `#F7F3EA` | warm surface | `#1F2937` **13.26:1**; `#5B6470` **5.42:1**; links `#005C3B` **7.31:1** |
| `--surface` | `#FFFFFF` | base surface | `#1F2937` **14.68:1** |
| `--surface-alt` | `#F8F9FA` | subtle section alternate | `#1F2937` **13.93:1** |
| `--text` | `#1F2937` | body text | on white **14.68:1**, on ivory **13.26:1** |
| `--text-muted` | `#6B7280` | meta/captions **on white** | **4.83:1** |
| `--text-muted-on-warm` | `#5B6470` | meta/captions **on ivory / brand-50** (same role, different ground — the only sanctioned per-surface override) | **5.42:1** |
| `--border` | `#E5E7EB` | decorative dividers only | 1.24:1 — never a control boundary |
| `--border-control` | `#8A94A3` | input/select/button outlines (UI ≥ 3:1) | **3.07:1** |
| `--success` | `#046A3A` | success text | white **6.71:1** |
| `--warning` | `#8A5A00` | warning text | white **5.93:1** (from prior token set) |
| `--danger` | `#A4232B` | error text/button | white **7.36:1** |
| `--info` | `#1E5AA8` | informational | white **6.81:1** |
| `--focus` | `#0A7A52` | focus ring on light | **5.36:1** |
| `--focus-on-dark` | `#FFDE00` | focus ring on `--brand-900/700` | **9.00:1 / 6.05:1** |

### 4.2 Colour (admin dark theme)

| Token | Hex | Note |
|---|---|---|
| `--d-surface` | `#0F1F18` | from `tokens.css --color-text` used as dark ground |
| `--d-surface-alt` | `#16291F` | cards |
| `--d-text` | `#E8F5EF` | body — **15.24:1** on `#0F1F18` |
| `--d-text-muted` | `#A8C2B5` | meta — **8.99:1** on `#0F1F18` |
| `--d-border` | `#2A4034` | decorative dividers only (1.53:1) |
| `--d-border-control` | `#5E7A6B` | input/control outlines — **3.64:1** on `#0F1F18`, **3.26:1** on `#16291F` |
| `--d-focus` | `#FFDE00` | ring — **12.77:1** on `#0F1F18` |
| `--d-brand` | `#0A7A52` | primary action on dark; white text on it = **5.36:1** |

### 4.3 Spacing, layout, radius, elevation

| Token | Value | Token | Value |
|---|---|---|---|
| `--space-1…10` | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px | `--radius-sm/md/lg/full` | 6 / 10 / 16 / 9999 px |
| `--container` | 1100 px content, 1280 px wide | `--shadow-sm` | `0 4px 12px rgba(0,92,59,.06)` |
| `--gutter` | 16 px < 768, 24 px ≥ 768 | `--shadow-md` | `0 14px 32px rgba(0,92,59,.08)` |
| `--section-y` | 48 px mobile, 80 px ≥ 768, 96 px ≥ 1280 | `--shadow-lg` | `0 24px 48px rgba(0,92,59,.12)` |
| `--header-h` | 72 px desktop / 64 px mobile | `--nav-touch` | **44 px minimum** |
| Breakpoints | 360 · 480 · 768 · 1024 · 1280 · 1536 | `--content-measure` | 68 ch |

### 4.4 Typography

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--text-display` | 44 / 1.15 (mobile 32 / 1.2) | 700 | hero H1 |
| `--text-h1` | 36 / 1.25 | 700 | page title |
| `--text-h2` | 28 / 1.3 | 700 | section |
| `--text-h3` | 22 / 1.35 | 600 | card title |
| `--text-h4` | 18 / 1.45 | 600 | sub-heading |
| `--text-lead` | 18 / 1.7 | 400 | lead paragraph |
| `--text-body` | 16 / **1.75** | 400 | body |
| `--text-sm` | 14 / 1.6 | 400 | meta, table cells |
| `--text-xs` | 13 / 1.5 | 500 | chips, captions (never paragraphs) |

Family: `--font-th: "Sarabun", "Noto Sans Thai", system-ui, sans-serif`. Weights 400/600/700, self-hosted WOFF2, Thai+Latin subset, `font-display: swap`, preload one file. Numerals: `font-variant-numeric: tabular-nums` in tables and dashboards. No italic for Thai; no uppercase; `letter-spacing: 0` for Thai, `-0.01em` for display Latin only.

### 4.5 Motion

| Token | Value |
|---|---|
| `--dur-fast` / `--dur-base` / `--dur-slow` | 120 / 200 / 320 ms |
| `--ease` | `cubic-bezier(.2,0,.2,1)` |
| Allowed | fade, reveal-on-scroll (600–1200 ms), hover lift ≤ 5 px, ambient gradient |
| Banned | bounce, spin, autoplay carousel, RGB cycling, parallax > 20 px, scroll-jacking |
| Reduced motion | all transforms/transitions disabled under `prefers-reduced-motion: reduce` |

`.card-hover` from Stitch (translateY −5 px / 300 ms) is kept but gated behind the reduced-motion query.

### 4.6 Z-index scale

`--z-base 0` · `--z-sticky 10` · `--z-header 40` · `--z-drawer 60` · `--z-modal 80` · `--z-toast 100` · `--z-skip 110`.

---

## 5. Stitch V2 → token mapping

| Stitch class / value | Current | Replaced by | Reason |
|---|---|---|---|
| `bg-brand-primary` | `#005C3B` | `bg-[--brand-700]` | same value, tokenised |
| `bg-brand-dark`, `from-brand-dark/90` | `#003F2A` | `--brand-900` | same |
| `bg-brand-forest` | `#014D35` | `--brand-800` | same |
| `text-brand-gold`, `bg-brand-gold` | `#D8A01A` | `--gold` | same; **text on white now banned** |
| `text-white` on `bg-brand-gold` (CTA) | 2.34:1 | `text-[--brand-900]` on `--gold` | contrast fix |
| `text-gray-200` hero paragraph | `#E5E7EB` on dark | `--brand-100` on `--brand-900` | consistent, ≥ 10:1 |
| `text-gray-700` nav | Tailwind palette (resolves to ~`#364153` on Tailwind 4.2.4) | `--text` | palette class, not a token |
| `text-gray-600` utility | Tailwind palette (resolves to ~`#4A5565` on Tailwind 4.2.4) | `--text-muted` | palette class, not a token |
| `border-gray-300` input | Tailwind palette (≈1.5:1) | `--border-control` | UI 3:1 |
| `placeholder:text-gray-400` | 2.54:1 | `--text-muted` | contrast fix |
| `focus:ring-brand-gold` | 2.34:1 | `--focus` | contrast fix |
| `shadow-soft` | `0 4px 20px rgba(0,0,0,.05)` | `--shadow-md` | green-tinted, consistent |
| `min-h-[600px]` hero | arbitrary | `min-h-[clamp(420px,52vh,560px)]` | above-the-fold budget |
| `text-4xl md:text-5xl lg:text-6xl` | 4 sizes | `--text-display` with fluid clamp | one scale |
| `.card-hover` | translateY −5 px | kept + reduced-motion guard | policy |
| `.scrollbar-hide` | utility | kept (verified horizontal rails only) | fine |

---

## 6. Component reconciliation

### 6.1 Public (from Stitch V2 + repo)

| Component | Path | Status | Required change |
|---|---|---|---|
| Hero | `stitch-landing-v2/HeroSection.tsx` | **ADAPT** | gold CTA text → brand-900; fluid height (prototype is fixed `h-[600px]`); hero headline remains the only `h1`; background image keeps `alt=""` because the message is real HTML text (decorative media) |
| ServiceCards | `stitch-landing-v2/ServiceCards.tsx` | **REUSE** | token swap; real routes |
| ResearchInnovationSection | `stitch-landing-v2/ResearchInnovationSection.tsx` | **ADAPT** | data from CMS, not hardcoded |
| StatisticsSection | `stitch-landing-v2/StatisticsSection.tsx` | **ADAPT** | every figure needs `source` + `as_of`; placeholders blocked in build |
| ContentSection | `stitch-landing-v2/ContentSection.tsx` | **ADAPT** | real news query; empty state |
| KnowledgeResources | `stitch-landing-v2/KnowledgeResources.tsx` | **REUSE** | token swap |
| PartnersSection | `stitch-landing-v2/PartnersSection.tsx` | **REUSE** | alt text per logo |
| SiteFooter | `stitch-landing-v2/SiteFooter.tsx` | **ADAPT** | real links, legal row, no `href="#"` |
| LocaleSwitcher | `stitch-landing-v2/LocaleSwitcher.tsx` | **ADAPT** | route-aware, `hreflang`-consistent |
| StitchLandingRenderer | `stitch-landing-v2/StitchLandingRenderer.tsx` | **REBUILD** | split into `layout` + sections; move to `app/(public)/[locale]/page.tsx`; delete duplicated `/en/` route |
| Header (Stitch inline) | inside renderer | **REBUILD** | reuse `components/navigation/*` instead; add `aria-expanded`, focus trap, working search |
| Search field | inside renderer | **REBUILD** | functional form → `/search?q=` |
| Navigation | `components/navigation/*` | **REUSE** | token swap + 7-section IA |
| PageSimple | `components/PageSimple.tsx` | **REUSE** | token swap |
| PersonnelSection | `components/PersonnelSection.tsx` | **ADAPT** | consent-driven data only |
| ServiceCatalog | `components/ServiceCatalog.tsx` | **REUSE** | CMS data |
| NewsListing / NewsArticleBody | `components/News{Listing,ArticleBody}.tsx` | **ADAPT** | DB data, share bar, related, `NewsArticle` schema |
| Document Center (7 components) | `src/features/document-center/components/*` | **REUSE** | DB-backed repository, pagination |
| SiteSearch | `components/SiteSearch.tsx` | **ADAPT** | server-side search, keep UI |

### 6.2 Admin (new, replacing AdminLTE)

| Component | Status | Notes |
|---|---|---|
| AppShell (sidebar + topbar + content) | **NEW** | 240 px sidebar, collapsible, persisted per user |
| NavGroup / NavItem (mega menu) | **NEW** | keyboard traversable, `aria-current` |
| DataTable (sort/filter/paginate/bulk) | **NEW** | TanStack Table; server-side pagination |
| FilterBar / SavedView | **NEW** | URL-synced filters |
| FormField set (text, textarea, select, date, switch, file, signature) | **NEW** | visible labels, `aria-describedby` errors, 44 px |
| RichTextEditor | **NEW** | allow-list sanitisation server-side |
| MediaPicker | **NEW** | alt required, crop, derivative preview |
| WorkflowStepper | **NEW** | state + actor + timestamp |
| AuditTrail | **NEW** | read-only timeline |
| KpiCard / ChartCard | **NEW** | empty/loading/error states |
| Toast / ConfirmDialog | **NEW** | focus-trapped, `role="alertdialog"` |
| CommandPalette (⌘K) | **NEW** | global admin search |
| PermissionGate | **NEW** | hides UI *and* is paired with server checks |

Total: **19 public component groups reconciled** (Document Center counted as one group of 7), **13 admin components new**, **0 components carried over unchanged without a token pass**.

---

## 7. Accessibility remediation of the baseline

| # | Defect (verified) | Fix | Test |
|---|---|---|---|
| 1 | `<div lang>` instead of `<html lang>` (`app/[locale]/layout.tsx:39`) | set `lang` on `<html>` in the root layout from the locale param | DOM assertion, both locales |
| 2 | White text on gold CTA 2.34:1 | `#003F2A` on gold (5.14) | axe + contrast script |
| 3 | Placeholder 2.54:1 | `--text-muted` + persistent labels | axe |
| 4 | Input borders 1.24–2.54:1 | `--border-control` 3.07:1 | axe "non-text contrast" |
| 5 | Focus ring gold 2.34:1 | `--focus` green 5.36:1, 2 px offset | keyboard walkthrough |
| 6 | Mobile menu without `aria-expanded` / focus trap | disclosure pattern + trap + `Esc` | keyboard-only test at 412 px |
| 7 | Search input with no action | real `<form role="search">` → `/search` | functional test |
| 8 | All nav links `href="#"` | typed route objects, build fails on `"#"` | unit test scanning nav data |
| 9 | Background hero image `alt=""` while carrying the message | text is real HTML; media is decorative → `alt=""` is then correct | content review |
| 10 | Statistics hardcoded `NEEDS_VERIFICATION` | `source` + `as_of` required; build fails if missing | schema validation |
| 11 | `.card-hover` transform without reduced-motion guard | wrap in media query | CSS assertion |
| 12 | Skip link exists in Stitch renderer (good) but not in the repo layout | keep and standardise in `SiteShell` | DOM assertion |

---

## 8. Governance and CI enforcement

| Rule | Enforcement |
|---|---|
| No raw hex outside `styles/tokens.css` | stylelint `color-no-hex` with an allow-list for the token file |
| No Tailwind palette classes for brand roles (`text-gray-*`, `bg-blue-*`) | ESLint `no-restricted-syntax` on className literals `[A]` (advisory), code review |
| Every interactive element ≥ 44 × 44 px | automated tap-target probe on key routes |
| Contrast ≥ 4.5:1 body / 3:1 large & UI | automated token-pair test (fails CI if a pair regresses) |
| `href="#"` forbidden in nav/CTA data | unit test |
| Stats require `source` + `as_of` | zod schema in build |
| Motion reduced-motion honoured | CSS lint + manual check |
| Assets: naming + size caps | uploader validation + build-time audit |
| Bilingual: no hardcoded EN in `/th` | lint rule scanning JSX literals `[A]`, plus content review |

---

## 9. Adoption checklist

- [ ] Replace `app/tokens.css` + `stitch-landing.css` with a single `src/styles/tokens.css` containing §4 values
- [ ] Sweep Stitch components for raw hex, `text-gray-*`, `border-gray-*`, `focus:ring-brand-gold`
- [ ] Land the `<html lang>` fix
- [ ] Land gold-CTA and focus-ring fixes
- [ ] Introduce `--border-control` on all form controls
- [ ] Delete the duplicated `app/en/stitch-landing-v2/` route in favour of `[locale]`
- [ ] Add the token-pair contrast test to CI
- [ ] Add the `href="#"` guard test
- [ ] Add the stats `source`/`as_of` schema
- [ ] Port `docs/design-system/*` and `docs/creative/*` into `docs/policy/`
- [ ] Record token decisions as ADR-0002 (palette) and ADR-0003 (typography)

**Open items:** dark-theme *surface alt* and badge pairs need verification once implemented (`[U]`); whether Sarabun 500 is required for captions (currently 400/600/700); final decision on whether the public site ships dark mode at launch (`[U]`).
