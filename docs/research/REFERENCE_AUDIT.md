# REFERENCE_AUDIT.md
### Evidence-based audit of `rae.mju.ac.th` and three Thai university reference sites

| | |
|---|---|
| **Prepared** | 2026-10-24 (UTC+7) |
| **Scope** | 4 public homepages + 7 RAE sub-pages, two viewports, read-only |
| **Method** | REA MCP `inspect_web_page` (CDP), deterministic CDP probes, static HTML analysis, HTTP header/robots probes — see `EVIDENCE/README.md` |
| **Gates** | `AGENT_CORE_CONNECTED` ✅ `REA_ANALYSIS_VERIFIED` ✅ `BLUEPRINT_READY_FOR_REVIEW` ✅ |

**Evidence tags used throughout**

| Tag | Meaning |
|---|---|
| `[V]` | **Verified** in this session — a measurement, a response code, or a DOM/HTML fact exists in `EVIDENCE/` |
| `[A]` | **Assumption / inference** from DOM+CSS evidence, not exercised interactively |
| `[U]` | **Unverified** — requires owner input, real devices, or authenticated access |

---

## 1. Cross-site snapshot (all `[V]`)

| Metric | **RAE (current)** | SPU | UTCC | DPU |
|---|---|---|---|---|
| HTML document bytes | 149,939 | 403,126 | **8,959,324** | 281,937 |
| Requests, first load | 59 | 174 | 127 | 205 |
| DOMContentLoaded | 349 ms | 469 ms | **4,274 ms** | 309 ms |
| Load event | **7,585 ms** | 1,203 ms | 7,474 ms | 1,816 ms |
| Full-page height 1440 px | 4,395 px | 8,246 px | 8,309 px | 7,745 px |
| Full-page height 412 px | **11,953 px** | 11,668 px | 14,221 px | 9,137 px |
| Mobile ÷ desktop height | **2.72×** | 1.41× | 1.71× | 1.18× |
| `<h1>` on homepage | **0** | 2 (one is a chat widget) | 1 | **0** |
| Meta description | **absent** | 158 chars | 156 chars | 60 chars |
| `rel=canonical` | **absent** | present | present | **absent** |
| `hreflang` | **none** | `th,en,cn,x-default` | none | none |
| JSON-LD blocks | **0** | 3 (`ImageObject`,`HowTo`,`FAQPage`) | 2 (`BreadcrumbList`,`Organization`,`WebPage`) | 1 (`CollegeOrUniversity`) |
| `robots.txt` / XML sitemap | **404 / 404** | 200 / 200 | 200 / 200 | 200 / **HTML shell, not XML** |
| `<html lang>` | **missing** | `th` | `th` | `th` |
| Landmarks header/nav/main/footer | **0/0/0/1** | 1/14/0/1 | 2/0/1/1 | 9/1/16/0 |
| Skip link | **no** | yes | yes | **no** |
| Images without `alt` | 4 / 34 | 0 / 63 | 6 / 2,677 | 6 / 81 |
| Text failing WCAG AA contrast | 14 | 5 | 27 | 10 |
| Interactive targets < 24 px | 4 | 34 | 61 | 69 |
| Links with no accessible name | 6 | 19 | 18 | 13 |
| Body type stack | `myFont` (custom) + Sarabun | Sarabun / Noto Sans Thai / Prompt | `CSPraJad` (custom) + `WhetisakDojo` | IBM Plex Sans Thai + DPU Nopparat |
| Brand colour(s) measured | `#017F3F` green **+ Bootstrap blue `#1E4080` + cyan `#17A2B8` + orange `#FF9800` + red `#FF0000`** | `#CC3366` pink, near-black blocks | `#2E3191` navy, `#FFC709`, `#00B1EB` | `#20194A` indigo, `#691BFF` violet, `#15BD66` CTA |
| Platform | ASP.NET WebForms / IIS 10.0 / WTMS 2021 CMS / Bootstrap 5 + jQuery 3.5.1 | WordPress + Elementor + WPML + Swiper | WordPress + The7 + WPBakery + Revolution Slider + HubSpot + LINE | Nuxt 3 (Vue) + Tailwind + Swiper |
| Site search on homepage | **none** | none | 1 form (GET → `/`) | **none** (0 `input[type=search]`) |

Reading note: transfer-size and TTFB figures were partly served from a warm local cache (SPU 2 ms TTFB) and are **not** valid benchmarks; document bytes, DOM counts, request counts and event timings are comparative.

---

## 2. RAE — current website (`rae.mju.ac.th`)

### 2.1 Identity & platform `[V]`

- Title: `สำนักวิจัยและส่งเสริมวิชาการการเกษตร มหาวิทยาลัยแม่โจ้`; English name rendered in the header: *The Office of Agricultural Research and Extension Maejo University*.
- Server: `Microsoft-IIS/10.0`, `X-Powered-By: ASP.NET`, `X-AspNet-Version: 4.0.30319`, `Cache-Control: private` on every page sampled.
- CMS: footer credit **"Web Template Management 2021"**; all content is addressed by opaque numeric IDs: `wtms_webpageDetail.aspx?wID=2022`, `wtms_newsDetail.aspx?nID=38764`.
- Front-end assets: `/wtms_system/bootstrap/css/bootstrap.css` + `bootstrap-grid.css` + `bootstrap-utilities.css`, `bootstrap-icons.css`, `jquery-3.5.1.min.js`, `bootstrap.min.js`, `mainCSS.css`; custom webfont `myFont`, plus Sarabun.
- Analytics: GA4 via `googletagmanager.com` (`gtag`, cookies `_ga`, `_ga_2WSQZQ08Y2`).
- REA evidence envelope: `EVIDENCE/rea/rae_home_inspect_raw.json` (`ev_6c6b67a2…`, provider `rea-cdp-browser` v2, `authority: external-service`, `confidence: observed`, DOM 1,800 nodes, 4 first-party scripts).

### 2.2 Information architecture as built `[V]`

Primary navigation renders **16 anchors covering only 4 top-level destinations** (2 of them are menus), because dropdown children are flattened into the same container:

```
หน้าหลัก                                  wtms_index.aspx
เกี่ยวกับสำนักวิจัยฯ                      (#, dropdown parent)
  ├─ ความเป็นมา ปรัชญา วิสัยทัศน์ พันธะกิจ   wID=2022
  ├─ โครงสร้างองค์กร                       wID=2387
  ├─ โครงสร้างการบริหาร                    wID=1960
  ├─ โครงสร้างผู้บริหาร                    wID=1908
  ├─ หน่วยงานภายใน                         (#, nested parent)
  │   ├─ กองบริหารงานวิจัย                  wID=1941
  │   ├─ กองบริหารงานสำนักวิจัยฯ            wID=2042
  │   └─ กองบริหารงานบริการวิชาการ          wID=2043
  ├─ บุคลากรภายใน                          wID=2390
  ├─ กองบริหารงานสำนักวิจัยฯ                wID=2463   ← duplicate label, different target
  ├─ กองบริหารงานวิจัย                     wID=2012   ← duplicate label, different target
  └─ กองบริหารงานบริการวิชาการ              wID=2013   ← duplicate label, different target
เอกสารดาวน์โหลด                           wID=1909
ติดต่อ                                    wID=954
```

Utility strip (table cells, not a list): `หน้าแรก · บุคลากรตามโครงสร้าง · มหาวิทยาลัยแม่โจ้ · MJU-mail · ที่อยู่ติดต่อ · ภาษาไทย · ผู้ดูแลระบบ` + six icon shortcuts (`menu-icon-{mju,mail,erp,person,calendar,contact}`).

Defects visible in the tree itself:

| ID | Defect | Evidence |
|---|---|---|
| IA-1 | Same label resolves to two different pages (3 cases) | menu dump above |
| IA-2 | Only **4** top-level destinations for a whole office; 12 of the 16 anchors are nested under `เกี่ยวกับสำนักวิจัยฯ` | menu dump above |
| IA-3 | `บุคลากรตามโครงสร้าง` returns **HTTP 404** | `GET /wtms_personStructure.aspx?lang=th-TH` → 404 |
| IA-4 | Navigation is not a `<nav>`; utility strip is a `<table>` | landmarks header/nav/main = 0 |
| IA-5 | `ผู้ดูแลระบบ` (admin login) exposed in the public utility bar | header markup |
| IA-6 | No breadcrumb on the homepage; inner pages only carry a `breadcrumb-holder` title bar, not a trail | `rae_news_detail.html` |
| IA-7 | Language switch is `?lang=th-TH` / `?lang=en-US` with no `hreflang` and a Thai `<title>` on the English page | `/wtms_index.aspx?lang=en-US` |

### 2.3 Homepage anatomy (document order) `[V]`

| # | Block | Measured |
|---|---|---|
| 1 | Green utility header, table-based, 90 px | `.web-header-lg` |
| 2 | 7-slide **autoplay carousel** of 1600×500 banner images, 450 px tall on desktop / **129 px on mobile** | `.carousel`, `data-bs-ride`, 7 `.carousel-item` |
| 3 | Philosophy / vision strip with yellow highlighted text | `strong` `#FFCC00` on `#017F3F` |
| 4 | **ข่าวประชาสัมพันธ์และกิจกรรม** — 5 Bootstrap tab panes (`ข่าวทั้งหมดของหน่วยงาน`, `ข่าวกิจกรรม`, `ข่าวประชาสัมพันธ์`, `ข่าวจัดซื้อ-จัดจ้าง/สมัครงาน`, `ข่าวประกาศ`), ~41 news links shipped in the initial HTML, each card = image + 2-line excerpt + date | `#myTab`, `rae_home.html` |
| 5 | Quick Access → **ระบบสารสนเทศ**: `Work tools` (8 tiles), `Research data` (2), `Knowledge and service` (6), then **หน่วยงานในกำกับสำนักวิจัยฯ** (4), **สื่ออิเล็กทรอนิกส์** (7) | `EVIDENCE/notes/rae_home_outline.txt` |
| 6 | **DIRECTOR** block — portrait, name, one-line policy statement | h3 name at 44 px |
| 7 | Long flat link lists: `ภายในหน่วยงาน`, `บริการความรู้` (6), `One Stop Service` (5), `ห้องประชุม` (3), `ลิงค์อื่นๆ` (3) | outline |
| 8 | Green footer, 365 px: address, phone, e-mail, `นโยบายการพัฒนาระบบ`, `ทีมพัฒนาระบบ`, repeated main menu, `เปลี่ยนภาษาบนเว็บไซต์` | `.footer` |

Homepage totals: 163 anchors, 34 images, **9 `<table>` elements with 0 `<th>`** (used as layout scaffolding), 1 `<form>` whose 19 inputs are all ASP.NET hidden fields plus a `ddl_lang` radio, 4 YouTube `<iframe>`s, 1 `<h2>`, 2 `<h3>`, **0 `<h1>`**.

### 2.4 Visual system `[V]`

| Aspect | Measurement | Assessment |
|---|---|---|
| Brand green | `#017F3F` (nav bar, footer, headings), white text = 5.11:1 ✅ | Consistent, ownable, keep |
| Secondary palette | `#1E4080` (9 uses), `#FF9800`, `#17A2B8`, `#2196F3`, `#28A745`, `#FF0000`, `#FFCC00`, `#F0F8FF`, `#F0FFF4`, `#E6F3FF` | 10+ unrelated hues = Bootstrap colour utilities used as brand; no system |
| Type | `myFont` (101 nodes) + `Sarabun` (26); base 16 px; sizes 12 / 12.8 / 14 / 15.2 / 16 / 17.6 / 18 / 19.2 / 28 / 44 / 48 px | 11 sizes, 2 families, no documented scale |
| Rhythm | No spacing scale; `style="…"` attributes inline (`over-shadow mb-3` cards); 9 nested `<table>` elements (none with `<th>`) | Layout driven by markup, not tokens |
| Icons | `bootstrap-icons` + emoji-ish coloured circles in quick access | Mixed iconography |
| Imagery | 1600×500 banners with **text baked into the JPEG/PNG** | Not translatable, not accessible, breaks at 129 px mobile height |
| Density | 4,395 px desktop; **11,953 px mobile** | 2.72× growth — every card stacks |

Contrast failures (`EVIDENCE/notes/a11y_rae_1440.json`, 14 elements):

| Element | Foreground / background | Ratio | Required |
|---|---|---|---|
| `จดหมายข่าววิจัยและบริการวิชาการ` tile | `#FFFFFF` on `#FF9800` | **2.16** | 4.5 |
| `Knowledge Newsletter` | `#FFFFFF` on `#FF9800` | **2.16** | 4.5 |
| `คณะกรรมการจริยธรรมการวิจัย` / IRB | `#FFFFFF` on `#17A2B8` | 3.04 | 4.5 |
| `วารสารวิจัยฯ` / Maejo University Journal | `#FFFFFF` on `#2196F3` | 3.12 | 4.5 |
| `ศูนย์เกษตรอินทรีย์` | `#FFFFFF` on `#28A745` | 3.13 | 4.5 |
| `Maejo Vision` / Video Channel | `#FFFFFF` on `#FF0000` | 4.00 | 4.5 |
| Header institution name | `#FFCC00` on `#017F3F` | 3.38 | 4.5 |

### 2.5 Responsive behaviour `[V]`

- Breakpoints come from Bootstrap 5 (`576/768/992/1200/1400`) **plus one hand-written `max-width: 575px`** and two `prefers-reduced-motion` blocks — i.e. the theme adds almost nothing of its own.
- Two separate header implementations exist and **both ship on every page**: `.web-header-sm` (mobile, 70 px, visible at 412 px) and `.web-header-lg` (90 px). At 1440 px the mobile header is present with height 0. The mobile header is wrapped in `.fixed-top` while the desktop header is not `[V]`.
- Hero becomes 412×129 px; the banner's own typography is unreadable at that size.
- Page grows to 11,953 px; the quick-access and link-list sections stack without progressive disclosure.
- Mobile navigation is a **Bootstrap modal** (`#siteMenu`, 17 links) opened from a grid-icon link: `<a href="#" data-bs-toggle="modal" data-bs-target="#siteMenu"><i class="bi-grid-3x3-gap-fill">`. The trigger has **no accessible name** (icon only, no `aria-label`), and the dialog's `aria-labelledby="exampleModalLabel"` points at a placeholder id `[V]`.
- Horizontal overflow on desktop: `scrollWidth 1444` vs `1440` (4 px) `[V]`.
- Mobile TTFB measured 1,914 ms on one run vs 309 ms desktop `[V]` (variance, but no mobile-specific optimisation exists).

### 2.6 Accessibility `[V]`

| Check | Result |
|---|---|
| `<html lang>` | **missing** → Thai TTS reads with the wrong voice |
| Landmarks | header 0, nav 0, main 0, footer 1 |
| Headings | no `<h1>`; first heading is `<h2>`; 3 headings for a 4,000 px page |
| Skip link | absent |
| Images | 4 of 34 without `alt` (banner images carry the message as pixels) |
| Links without accessible name | 6 |
| Form labels | homepage form is all hidden inputs, but `ddl_lang` radio has no label |
| Contrast | 14 failures (worst 2.16:1) |
| Mobile menu trigger | icon-only `<a>` with no accessible name; dialog `aria-labelledby` = `exampleModalLabel` (placeholder) |
| Reduced motion | present for Bootstrap components ✅ (`prefers-reduced-motion` rules found) |
| Keyboard | carousel is Bootstrap-standard `[A]`; tabs are `role=tablist` ✅ |

### 2.7 SEO & performance `[V]`

- **`robots.txt` → 404; `/sitemap.xml` → 404** (`/sitemap_index.xml` → 404; `/wp-sitemap.xml` closed the connection instead of responding). No machine-readable sitemap of the office's content.
- Homepage: no meta description, no canonical, no Open Graph, no JSON-LD, no `h1`.
- Inner pages: `wtms_webpageDetail.aspx` returns an **empty `<title>`** (browser tab = URL) and empty description; the about page has **two `<h1>`s**.
- News detail has `og:title` + `og:image` but no `og:description`, no `canonical`, no `NewsArticle` schema, no share affordance.
- URLs are `wID=`/`nID=` integers: no keyword, no section, no language prefix.
- Weight: 59 requests / **2.78 MB** transferred; the 4 YouTube embeds alone keep `load` at **7,585 ms**.
- 27 `<img>` with only 6 `loading="lazy"`; no `srcset`/`picture`; no AVIF/WebP negotiation.

### 2.8 Content operations `[V]` + `[U]`

- Every page is a CMS record `[V]`; the editorial surface is `wtms_adminIndex.aspx` (linked) `[V]`; admin role model is `[U]`.
- The homepage already contains a de-facto **systems directory** (20+ tools). External hosts referenced from the homepage include `erp.mju.ac.th`, `goffice.mju.ac.th`, `irb.mju.ac.th`, `kb.mju.ac.th`, `maejovision.mju.ac.th`, `rspg.mju.ac.th`, `royal.mju.ac.th`, `sciencebase.mju.ac.th`, `li01.tci-thaijo.org` (ThaiJO), `online.anyflip.com`, `docs.google.com`, `datastudio.google.com`, `script.google.com`, `office.com`, plus two non-MJU domains (two unmanaged third-party app domains (names withheld)) `[V]`.
- That spread is the single best argument for a *curated systems directory with owner + audience + SSO metadata* rather than a flat link list.

---

## 3. Reference site 1 — Sripatum University (`spu.ac.th`)

### 3.1 Positioning and IA `[V]`

- Title `มหาวิทยาลัยศรีปทุม`; description 158 chars; canonical + `hreflang` (`th`, `en`, `cn`, `x-default`); WordPress 7.1.3 + Elementor; WPML language cookie.
- Top-level nav (8): `สมัครเรียน`, `คณะและหลักสูตร`, `นักศึกษา`, `วิทยาเขต`, `International`, `SCMS`, `Job`, `TH`.
- The first menu container alone holds **102 links**, i.e. a true mega-menu: `สมัครเรียน` → `ปริญญาตรี 2570`, `คณะ/สาขาที่เปิดรับ`, `ค่าเทอม`, `ทุนการศึกษา`, `กองทุนกู้ยืมฯ`, `สมัครเรียนเพื่อรับทุน` (external `servadmission.spu.ac.th`), `วิธีการสมัครเรียน`, `การเดินทาง`, `นโยบายความเสมอภาค` …

### 3.2 Homepage composition `[V]`

1. Utility + sticky-free header (`header` position `static`), logo, nav, `TH/EN/CN`.
2. **Hero: full-bleed 650 px slide stack** (`.swiper`, 7+ slides at 650 px) — visually the strongest element on the page.
3. **11-tile audience/task shortcut grid**, each `<h2>` 16 px: `ปริญญาตรี`, `ค่าเทอม`, `ทุนการศึกษา`, `กองทุนกู้ยืมฯ`, `นักศึกษาใหม่`, `SPU dspace`, `ปริญญาโท-เอก`, `spucare`, `ปฐมนิเทศ`, `รับปริญญา`, `SDGs`.
4. `Why? SPU` (35 px heading), `SPU Video`, `Showcase`, `SPU NEWS`, `SPU Update`, `SPU Calendars`, `Gallery`, `FAQ` accordion, `ข้อมูลอัปเดตล่าสุด` timestamp.
5. Live-chat widget that injects its own `<h1>` (`👋 มีคำถามเรื่องสมัครเรียนทักได้เลย!!`) — the second `h1` on the page.
6. Footer with sitemap-style columns.

### 3.3 Visual system `[V]`

- Brand: `#CC3366` magenta (`rgb(204,51,102)`, 100 text nodes) on white/near-black blocks (`#111111`, `#3F3F3F`), accent light blue `#6EC1E4` panel. High-contrast, editorial, student-facing.
- Type: `Sarabun`, `Noto Sans Thai`, `Prompt`, plus legacy `DB-HELVETHAICA-X-COND`; body 16 px; sizes 14/15/16/18/20/24/35/40.
- 56 stylesheets and 27 script files — Elementor + plugin sprawl (`[V]` count of `<link rel=stylesheet>`), yet only 174 requests / 403 KB HTML.
- `prefers-reduced-motion` / `swiper` a11y defaults; 128 `aria-label`s; every image has `alt` (63/63) — best a11y hygiene of the four.
- Contrast: 5 failures / 2,912 checked (best ratio of the four).

### 3.4 What is worth reusing

| Pattern | Why it works here | Transfer to RAE |
|---|---|---|
| 11-tile **task grid** under the hero | Answers "what do I need?" in one screen | ✅ but 6 tiles, research/extension-specific |
| Mega-menu with third-level task labels | Holds ~100 destinations without a deep tree | ✅ 3 levels max, ≤7 groups |
| `FAQPage` + `HowTo` + `ImageObject` JSON-LD | Rich results for admission questions | ✅ `FAQPage` for service/funding questions |
| Skip link + full `alt` coverage | Cheap, provable a11y win | ✅ baseline |
| `hreflang` trio with `x-default` | Clean international entry | ✅ `th`/`en` + `x-default` |
| Update timestamp (`ข้อมูลอัปเดตล่าสุด`) | Trust signal for a public body | ✅ but as "ปรับปรุงล่าสุด" per page |

### 3.5 What not to copy

- Hero carousel of 650 px slides (7+ slides) — same "nobody sees slide 4" problem RAE already has.
- 56 CSS files / Elementor DOM depth — performance and a11y are good *despite* the stack, not because of it.
- Chat widget injecting an `h1` — heading-order pollution.
- `Job`, `SCMS` etc. as sibling primary nav items — internal systems belong in a utility/portal area, not next to `คณะและหลักสูตร`.

---

## 4. Reference site 2 — University of the Thai Chamber of Commerce (`utcc.ac.th`)

### 4.1 Positioning and IA `[V]`

- Title `หน้าแรก - มหาวิทยาลัยหอการค้าไทย`; AIOSEO 4.9.0; description 156 chars; canonical present; **no `hreflang`**.
- Top-level nav (8): `ผู้สนใจสมัครเรียน`, `คณะ`, `วิจัยและบริการธุรกิจ`, `นักศึกษาปัจจุบัน`, `ศิษย์เก่า`, `บุคลากร`, `สนับสนุนเรา`, `สมัครเรียน` — **an audience-first nav**, the closest model for RAE's mixed public.
- Header is `position: fixed` (sticky) `[V]`; a scroll-to-top control exists; a real search form exists (GET → `/`).
- Viewport meta is `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0` → **pinch-zoom disabled**, a WCAG 1.4.4 failure `[V]`.

### 4.2 Homepage composition `[V]`

1. Fixed header + language/utility links (`menulink-eng`, `menulink-cn`), search icon.
2. **Slider hero** (Revolution Slider `#rev_slider_14_3`, plus a second `#rev_slider_15_4`) around `#main-slideshow`.
3. `Happy University` (`<h1>`, 40 px) statement block.
4. `Dreams come true`, `UTCC Highlights`, `Cool Courses`, `News & Events` (`<h2>` 40 px each) — a clean four-beat editorial rhythm.
5. News area = **isotope grid with 2,637 `<article>` nodes in the live DOM** (2,617 in the server HTML), **46 rendered** inside a 439 px container — the entire news archive is shipped to the browser.
6. Five YouTube `<iframe>` embeds; HubSpot + LINE tracking.

### 4.3 Visual system `[V]`

- Navy `#2E3191` + yellow `#FFC709` + cyan `#00B1EB`; large white space; 40 px section headings; body 18 px.
- Fonts: `CSPraJad` (custom corporate Thai face) + `WhetisakDojo-Regular` (display) — strong, unmistakably Thai-corporate identity.
- 27 contrast failures / 4,000 checked; 2,380 images with empty `alt`; 61 targets < 24 px; 18 unnamed links.

### 4.4 What is worth reusing

| Pattern | Why | Transfer |
|---|---|---|
| **Audience-first top nav** | maps to RAE's 6 audiences | ✅ core of new IA |
| Explicit `วิจัยและบริการธุรกิจ` top-level item | legitimises research + service as a first-class section | ✅ split into `งานวิจัย` / `บริการวิชาการ` |
| Four-beat editorial homepage (`statement → highlights → courses → news`) | scannable rhythm | ✅ adapted |
| Sticky header + scroll-to-top | orientation on long pages | ✅ |
| Search in header | recovery path | ✅ required (RAE has none) |

### 4.5 What not to copy

- **9 MB HTML** and ~2,600 article nodes (46 painted) — this is the anti-pattern that would kill RAE's mobile users.
- `user-scalable=0` — never.
- Custom display font with a single weight and no fallback metrics → CLS risk `[A]`.
- Slider-inside-slider (`#rev_slider_14_3` **and** `#rev_slider_15_4`) — two competing heroes.

---

## 5. Reference site 3 — Dhurakij Pundit University (`dpu.ac.th/th`)

### 5.1 Positioning and IA `[V]`

- Nuxt 3 (Vue) + Tailwind; `data-capo` SSR; title/description 60 chars; `CollegeOrUniversity` JSON-LD; **no canonical**; `robots.txt` 200; `/sitemap.xml` returns the **HTML app shell** (not XML) — a real crawl gap.
- Header nav (**10 named items** plus the logo link): `中文`, `สมัครเรียน`, `หลักสูตร`, `วิทยาลัย/คณะ`, `ชีวิตนักศึกษา`, `เกี่ยวกับ DPU`, `Join Our Team`, `SLCM`, `Staff`, `Alumni`.
- Mega-menu holds 46 links that map **tasks to systems**, e.g. `สมัครปริญญาตรี → regisbachelor.dpu.ac.th`, `ตรวจสอบสถานะการสมัคร → dashboard.dpu.ac.th`, `ค้นหาหลักสูตร → /th/course/finder/bachelor`, `เปรียบเทียบหลักสูตร`, `Career Path Quiz → careeruni.dpu.ac.th`.
- A **PDPA-grade cookie consent** banner with `Privacy Notice` / `Cookie Policy` links in TH and EN `[V]`.

### 5.2 Homepage composition `[V]`

1. Transparent/absolute header over a dark hero (`bg-black` wrapper, 2 `<video>` elements, 4 `.swiper` instances).
2. Dark, full-bleed editorial sections; content cards with `group … relative` hover wrappers (288 px each).
3. Multi-column "shortcut" sections at 146 px row height (`hidden md:block` + column variants).
4. Body copy at 14 px desktop / 16 px mobile (`text-[14px] lg:text-[16px]`).

### 5.3 Visual system `[V]`

- Indigo `#20194A` base, violet `#691BFF` accent, green CTA `#15BD66`, surfaces `#EDEFF5` / `#EEECFB`.
- Type: `IBMPlexSansThai` (primary) + `DPU Nopparat` (brand display, 11 nodes); body 16 px; sizes 12/13/14/15/16/24/28/32.
- Tailwind breakpoints `480/640/768/1024/1280/1536` **plus 13 bespoke `min-width` values** (435/700/1026/1070/1080/1085/1100/1120/1140/1180/1200/1240/1380/1400 px) — evidence of per-section pixel tuning rather than a scale `[V]`.
- **No content headings**: the only `h1`–`h6` elements in the DOM are **two `H2`s inside the cookie-consent dialog** (rendered at height 0); every page section title is a `div`/`span`. Screen-reader heading navigation finds nothing on the actual page `[V]` (`ad_hoc_measurements.json → dpu`).
- Landmarks are inverted vs RAE: `header` 9, `main` 16, `footer` 0 — many headers, no footer landmark `[V]`.
- 10 contrast failures, 69 sub-24 px targets, 13 unnamed links.

### 5.4 What is worth reusing

| Pattern | Why | Transfer |
|---|---|---|
| **Task→system mega-menu** with real destination clarity | exactly the problem RAE's flat link list has | ✅ "ระบบสารสนเทศ" as a curated directory |
| Cookie/PDPA consent with policy links | legal baseline for a Thai public office collecting analytics | ✅ |
| Editorial dark hero with one message + one CTA | high signal, low choice | ✅ but lighter, image-led (agriculture) |
| Course/programme **finder + compare** | a reusable "finder" interaction for RAE services & experts | ✅ `ค้นหาผู้เชี่ยวชาญ` / `ค้นหาบริการ` |
| Tailwind-style token discipline (single spacing/colour source) | measurable consistency | ✅ tokens, *not* 13 custom breakpoints |

### 5.5 What not to copy

- 0 semantic headings, 0 footer landmark.
- Absolute (non-sticky) header + transparent hero → loses navigation on scroll.
- No site search at all.
- SPA shell served for `/sitemap.xml`.

---

## 6. Reusable pattern catalogue

Each pattern is bound to evidence and to a concrete RAE use.

| ID | Pattern | Source (verified) | RAE application | Priority |
|---|---|---|---|---|
| P-01 | Audience-first top-level navigation | UTCC nav (8 audience groups) | 6 audience entry tiles + `สำหรับ…` filters | P0 |
| P-02 | Mega-menu with task-level third column | SPU (102 links), DPU (46) | 7 sections × ≤6 groups × ≤8 links | P1 |
| P-03 | Task-tile grid immediately under hero | SPU (11 tiles) | 6 tiles: ขอทุน, ส่งข้อเสนอ, บริการวิชาการ, องค์ความรู้, ข่าว, ติดต่อ | P0 |
| P-04 | Single-message hero, HTML text + 1 CTA | DPU hero, UTCC statement | replace 7-slide banner carousel | P0 |
| P-05 | News card = image + 2-line title + BE date + category | SPU, UTCC, RAE | keep visual, fix semantics + dates | P1 |
| P-06 | Impact/numbers strip | SPU `Why? SPU`, UTCC `Highlights` | research KPIs with "source/date" caption | P1 |
| P-07 | Events calendar module | SPU `SPU Calendars` | ผสาน `wtms_calendar` + training calendar | P2 |
| P-08 | FAQ accordion + `FAQPage` schema | SPU | funding/service FAQs | P1 |
| P-09 | Language switch with `hreflang` + `x-default` | SPU | TH/EN parity with real translations | P0 |
| P-10 | PDPA cookie consent with policy links | DPU | PDPA notice + analytics opt-out | P0 |
| P-11 | Video facade (poster + play) instead of raw embeds | (none — RAE fails here) | cut 4 YouTube iframes from critical path | P0 |
| P-12 | **Curated systems directory** with owner/audience/SSO badge | (none of the three; RAE has the raw list) | 20+ internal tools, honestly labelled | P0 |
| P-13 | `CollegeOrUniversity`/`Organization` structured data | DPU, UTCC | `GovernmentOffice`+`Organization`+`WebSite` | P1 |
| P-14 | Breadcrumbs on every inner page + `BreadcrumbList` | UTCC JSON-LD, RAE partial bar | 3-level trail | P0 |
| P-15 | Sticky header + back-to-top on long pages | UTCC | yes, with `prefers-reduced-motion` | P1 |
| P-16 | Search with Thai-tolerant matching | UTCC (form), RAE (none) | site search over pages/news/docs/experts | P0 |

---

## 7. Verified defect register (RAE)

Severity: **S1** blocks a primary task or is a legal/a11y blocker · **S2** degrades comprehension or trust · **S3** polish.

| ID | Severity | Defect | Evidence | Owner impact |
|---|---|---|---|---|
| D-01 | S1 | Header link `บุคลากรตามโครงสร้าง` → HTTP 404 | `GET /wtms_personStructure.aspx?lang=th-TH` = 404 | staff, public |
| D-02 | S1 | No site search anywhere on the public site | 0 `input[type=search]`; form has only hidden ASP.NET fields | all |
| D-03 | S1 | `robots.txt` and `sitemap.xml` missing (404) | `robots_sitemap_summary.json` | SEO / discovery |
| D-04 | S1 | No `<html lang>` → wrong TTS/translation behaviour | `a11y_*.json` `lang: null` | a11y |
| D-05 | S1 | Homepage has no `<h1>`; page has 3 headings total | `html_analysis.json` `heading_counts` | a11y, SEO |
| D-06 | S1 | 9 layout `<table>`s; no `header`/`nav`/`main` landmarks | `html_analysis.json` | a11y |
| D-07 | S1 | 14 contrast failures, worst 2.16:1 on quick-access tiles | `a11y_rae_1440.json` | a11y, elderly users |
| D-08 | S2 | `wtms_webpageDetail.aspx` pages ship an **empty `<title>`** | `rae_subpage_probe.json` (`rae_about`, `rae_org`) | SEO, browser tabs |
| D-09 | S2 | No meta description / canonical / OG / JSON-LD on the homepage | `html_analysis.json` | SEO, link previews |
| D-10 | S2 | Hero = 7 autoplay slides, text baked into 1600×500 images; 129 px on mobile | `.carousel` measurement | comprehension, i18n |
| D-11 | S2 | Duplicate menu labels with different targets (3×) | nav dump | trust, navigation |
| D-12 | S2 | Mobile page 11,953 px; every card stacks; no progressive disclosure | probe 412 | mobile task completion |
| D-13 | S2 | 4 YouTube iframes on the critical path → `load` 7,585 ms | probe `resources.byType.iframe = 4`, `perf.load` | performance |
| D-14 | S2 | English page keeps a Thai `<title>` and partial Thai content; no `hreflang` | `rae_home_en.html` | international audience |
| D-15 | S2 | Flat link lists (`ลิงค์อื่นๆ`, `One Stop Service`, `บริการความรู้`) with no grouping, owner or state | `rae_home_outline.txt` | all |
| D-16 | S3 | 6 links with no accessible name; 4 images without `alt` | `a11y_*.json` | a11y |
| D-17 | S3 | 4 px horizontal overflow at 1440 px | `layout.docWidth = 1444` | polish |
| D-18 | S3 | No news sharing, no related-content structure on detail pages | `rae_news_detail.html` | reach |
| D-19 | S1 | Admin login (`ผู้ดูแลระบบ`) in the public utility bar | header markup | security hygiene |
| D-20 | S3 | `Cache-Control: private` on static-ish pages; 2.78 MB with only 6 lazy images | headers, probe | performance |
| D-21 | S2 | Mobile menu trigger is an unlabelled icon link; dialog name resolves to a placeholder id; mobile header is `fixed-top` while desktop is static | DOM probe @412, `verify_markup.py` | a11y, mobile |

---

## 8. Assumptions and open questions

`[A]` Menu open/close animation timing, carousel autoplay interval and tab keyboard handling are inferred from Bootstrap 5 classes and `data-bs-*` attributes; the open states were not exercised (only their markup was verified).
`[V]` RAE's mobile menu is a Bootstrap modal (`#siteMenu`) behind an unlabelled icon link — verified in DOM at 412 px and in the raw HTML.
`[U]` Whether MJU provides a shared site-search API; whether WTMS exposes a JSON feed; who owns each of the 20+ external tools; actual page/record counts inside WTMS; photo licensing; English translation capacity; hosting constraints (IIS-only vs container-capable).
