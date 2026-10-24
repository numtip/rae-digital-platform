# RAE_REDESIGN_BLUEPRINT.md
### Maejo University — Office of Agricultural Research and Extension (RAE)
### Evidence-based redesign blueprint for the public website

| | |
|---|---|
| **Version** | 1.0 — for review (no implementation performed) |
| **Date** | 2026-10-24 |
| **Inputs** | `REFERENCE_AUDIT.md`, `COMPARISON_MATRIX.md`, `EVIDENCE/` |
| **Current site** | `https://rae.mju.ac.th/wtms_index.aspx?&lang=th-TH` (ASP.NET WebForms, WTMS 2021) |
| **Status** | `BLUEPRINT_READY_FOR_REVIEW` — awaiting owner approval before build |

**Thai naming convention used in this document:** Thai labels are the production strings; English is the secondary locale.

---

## 1. Design goals

| # | Goal | Success looks like | Ties to |
|---|---|---|---|
| G1 | **Answer "where do I start?" in one screen** | at 1440×900 the 6 audience tiles and 4 priority actions are visible without scrolling; at 390×844 the tiles are visible and the actions are within one scroll | D-15, G-2 |
| G2 | **Make research and extension discoverable** | every service reachable in ≤3 clicks from home; search returns a page, a document and a person | D-02, G-1 |
| G3 | **Prove institutional trust** | owner + last-reviewed date on every page; PDPA notice; no dead links | D-01, D-09, G-4 |
| G4 | **Work on a ฿4,000 Android phone on 4G** | LCP ≤ 2.5 s, ≤ 800 KB initial, readable at 360 px | D-12, D-13, G-5/G-6 |
| G5 | **Be usable by everyone, including older farmers** | WCAG 2.2 AA, 44 px targets, ≥ 4.5:1 text, no text-in-image | D-04…D-07, G-3 |
| G6 | **Preserve RAE identity** | institutional green, Thai-first tone, Maejo agricultural imagery, existing emblem | — |
| G7 | **Separate public content from internal systems** | one curated systems directory; internal tools keep their own SSO and UI | D-15, G-9 |
| G8 | **Be maintainable after handover** | token-driven components; no inline colour/spacing; documented editorial workflow | D-06 root cause |

**Non-goals for this phase:** rebuilding ERP/IRB/knowledge-base applications; a mobile app; an authenticated staff portal; a full archive migration in release 1.

---

## 2. Audiences and top tasks

| Audience | Thai label | What they come for | Primary entry |
|---|---|---|---|
| Researchers & lecturers | นักวิจัย / อาจารย์ | funding calls, proposal rules, ethics, research DB, journal | `งานวิจัย` + search |
| RAE staff | บุคลากรสำนักวิจัยฯ | daily tools (face-scan, leave, rooms, vehicles), forms, director's calendar | `ระบบสารสนเทศ` |
| Farmers & growers | เกษตรกร | organic standards, plant/animal data, training, technology clinic | `บริการวิชาการ` |
| Communities & local orgs | ชุมชน / องค์กรท้องถิ่น | community service projects, area-based work, request support | `บริการวิชาการ` |
| Entrepreneurs & industry | ผู้ประกอบการ | testing services, IP/licensing, MoU, fees | `บริการวิชาการ` + `งานวิจัย` |
| Public & media | ประชาชน / สื่อ | news, announcements, procurement results, contact | `ข่าวและประกาศ` |
| Partners & international | ภาคี / นานาชาติ | English profile, publications, contact | `/en/` |

Task ranking (drives the homepage, from the content itself: 20+ tools, 5 news categories, 8 funding/service areas):

1. `ขอรับทุน/ส่งข้อเสนอโครงการ` 2. `ติดตามข่าว/ประกาศ` 3. `ขอรับบริการวิชาการ` 4. `ค้นหาองค์ความรู้/พันธุ์พืช` 5. `เข้าระบบภายใน` 6. `ติดต่อ/ขอเข้าพบ`

---

## 3. Proposed information architecture

### 3.1 Sitemap (public)

```
/ (ไทย)                                        หน้าแรก
├─ /about/                                     เกี่ยวกับสำนักวิจัยฯ
│  ├─ /about/history/                          ความเป็นมา ปรัชญา วิสัยทัศน์ พันธกิจ
│  ├─ /about/organization/                     โครงสร้างองค์กร
│  ├─ /about/executives/                       คณะผู้บริหาร
│  ├─ /about/divisions/                        หน่วยงานภายใน (3 กอง)
│  ├─ /about/staff/                            บุคลากร (ค้นหา/กรองตามกอง/ความเชี่ยวชาญ)
│  └─ /about/governance/                       ธรรมาภิบาล นโยบาย และจริยธรรม
├─ /research/                                  งานวิจัย
│  ├─ /research/funding/                       ทุนวิจัยและแหล่งทุน (เปิดรับ/ปิดรับ)
│  ├─ /research/proposals/                     การเสนอโครงการ + แบบฟอร์ม + กำหนดการ
│  ├─ /research/ethics/                        จริยธรรมการวิจัย (IRB) → irb.mju.ac.th
│  ├─ /research/database/                      ฐานข้อมูลงานวิจัย → researchex.mju.ac.th
│  ├─ /research/experts/                       ค้นหาผู้เชี่ยวชาญและนักวิจัย
│  ├─ /research/publications/                  ผลงานตีพิมพ์ + วารสาร (ThaiJO)
│  ├─ /research/ip/                            ทรัพย์สินทางปัญญาและถ่ายทอดเทคโนโลยี
│  └─ /research/clusters/                      กลุ่มวิจัย ศูนย์ความเป็นเลิศ
├─ /extension/                                 บริการวิชาการ
│  ├─ /extension/services/                     บริการและอัตราค่าบริการ
│  ├─ /extension/request/                      ขอรับบริการ (ขั้นตอน + ช่องทาง)
│  ├─ /extension/training/                     หลักสูตร/อบรม + ปฏิทิน
│  ├─ /extension/community/                    ชุมชนและพื้นที่ดำเนินงาน (case study)
│  ├─ /extension/organic/                      ศูนย์เกษตรอินทรีย์
│  ├─ /extension/technology-clinic/            คลินิกเทคโนโลยี
│  ├─ /extension/royal-projects/               โครงการอันเนื่องมาจากพระราชดำริ
│  └─ /extension/rspg/                         RSPG
├─ /knowledge/                                 องค์ความรู้
│  ├─ /knowledge/articles/                     บทความและองค์ความรู้
│  ├─ /knowledge/germplasm/                    ฐานข้อมูลพันธุ์พืช-สัตว์ → sciencebase.mju.ac.th
│  ├─ /knowledge/library/                      คลังเอกสาร E-book คู่มือ
│  ├─ /knowledge/media/                        แม่โจ้ปริทัศน์ / วิดีโอ
│  └─ /knowledge/newsletter/                   จดหมายข่าว
├─ /news/                                      ข่าวและประกาศ
│  ├─ /news/                                   ข่าวทั้งหมด (ตัวกรองหมวด)
│  ├─ /news/{slug}/                            ข่าว/กิจกรรม
│  ├─ /news/events/                            ปฏิทินกิจกรรม
│  ├─ /announcements/                          ประกาศ
│  ├─ /procurement/                            จัดซื้อจัดจ้างและผลผู้ชนะ
│  └─ /jobs/                                   รับสมัครงาน
├─ /systems/                                   ระบบสารสนเทศ (directory)
├─ /contact/                                   ติดต่อ แผนที่ One Stop Service
├─ /search/                                    ผลการค้นหา
├─ /accessibility/                             การเข้าถึงเว็บไซต์
├─ /privacy/                                   PDPA / นโยบายคุกกี้
└─ /en/…                                       English mirror of the 7 primary sections
```

**Why this shape**

- Seven sections mirror *what people do*, not the org chart. The three divisions stay inside `/about/divisions/` — a visitor should not need to know which กอง owns a service.
- `ระบบสารสนเทศ` becomes a first-class directory (P-12) instead of the flat `ลิงค์อื่นๆ` list (`D-15`).
- News, announcements and procurement are split because they have different lifecycles and different audiences (`D-10`, `G-10`).
- `/search/` is a top-level URL; `/news/events/` sits under news because events are a news-adjacent feed, and it is surfaced on the homepage and in the news mega-menu.
- The sitemap has **exactly 7 root content branches** — `about`, `research`, `extension`, `knowledge`, `news`, `systems`, `contact` — matching the 7 primary nav items one-to-one.

### 3.2 Navigation model

| Layer | Contents | Rules |
|---|---|---|
| Utility bar | `มหาวิทยาลัยแม่โจ้ · MJU Mail · ERP · ภาษาไทย/EN · ค้นหา · บุคลากรเข้าสู่ระบบ` | max 6 items; admin login **removed** from the public bar (`D-19`) |
| Primary nav (7) | `เกี่ยวกับสำนักวิจัยฯ · งานวิจัย · บริการวิชาการ · องค์ความรู้ · ข่าวและประกาศ · ระบบสารสนเทศ · ติดต่อ` | ≤ 3 words each; no dropdown-only parents; every parent has a landing page |
| Mega-menu | up to 3 columns × ≤ 8 links + 1 featured slot | group headings are real links; keyboard: `Enter`/`Space` open, `Esc` close, arrow keys traverse |
| Mobile drawer | accordion, 44 px rows, current-section highlight, close on route change | body scroll locked; focus trapped |
| Breadcrumbs | `หน้าแรก › งานวิจัย › ทุนวิจัย` | always rendered except home; last item `aria-current="page"` |
| Footer | 4 columns (sections, quick tasks, systems, contact) + legal row | legal: PDPA · Accessibility · Sitemap · `ปรับปรุงล่าสุด` |

### 3.3 URL and redirect policy

- Slugs are **Latin transliterated** (`/research/funding/`) with Thai titles: safer to type, share and print, and avoids percent-encoded Thai URLs in QR codes. Thai labels remain the visible text.
- Every legacy URL 301s:
  `wtms_webpageDetail.aspx?wID=2022 → /about/history/`,
  `wtms_newsDetail.aspx?nID=38764 → /news/{slug}/`,
  `wtms_index.aspx?lang=th-TH → /`, `?lang=en-US → /en/`.
- A `redirects.csv` (source, target, status, owner, verified-date) is a release artefact; a crawl test must show **0 chains, 0 loops, 0 404s** in the primary nav.
- Lowercase, hyphen-separated, no dates in news slugs, no query strings for language (path prefix `/en/` instead).

---

## 4. Key user journeys

### J1 — Researcher finds a funding call and submits a proposal
| Step | Today (`[V]`) | Target |
|---|---|---|
| 1 | Land on homepage; no `ทุนวิจัย` entry — must guess `งานวิจัย` doesn't exist in nav | Hero + tile `ขอรับทุนวิจัย` |
| 2 | Browse a flat list of 20+ coloured tiles | `/research/funding/` with status chips `เปิดรับ` / `ปิดรับ` and deadline countdown |
| 3 | Open a PDF from a `goverment/.../Doc_2569...pdf` path | Document card: title, BE date, `PDF · 1.2 MB`, purpose, download + preview |
| 4 | No guidance on how to submit | `/research/proposals/` step list + required forms + contact officer |
| 5 | Submission happens in another system `[U]` | Explicit CTA `ยื่นข้อเสนอผ่านระบบ…` with an SSO badge; new tab warning |

**Success metric:** ≥ 80 % of test users reach the funding guidelines PDF in ≤ 3 clicks and can name the submission channel.

### J2 — Farmer needs an organic-standard service
1. Search `มาตรฐานอินทรีย์` → results grouped **หน้า / ข่าว / เอกสาร / ผู้เชี่ยวชาญ**.
2. `/extension/organic/` → what it is, who it is for, service steps, fees, documents.
3. CTA `ขอรับบริการ` → form (name, contact, province, crop, request) with PDPA consent; fallback phone/LINE.
4. Confirmation screen with reference number `[U]` and expected response time.

**Success metric:** service page → request action ≥ 8 %; form completion ≥ 60 %.

### J3 — Staff member needs a daily tool
1. Utility bar `บุคลากรเข้าสู่ระบบ` or `/systems/`.
2. Directory card: tool name (TH/EN), owner division, audience badge (`บุคลากรเท่านั้น`), `SSO` badge, `เปิดระบบ` (external).
3. Tool keeps its own login; RAE site never hosts credentials.

**Success metric:** time-to-tool ≤ 15 s; zero support calls of the type "where is the face-scan link".

### J4 — Journalist needs a story and a spokesperson
News detail: category, BE publish date, 16:9 lead image, 1-paragraph summary, body, photo credits, contact box (name, role, phone, e-mail), share buttons, related 3.

### J5 — International partner evaluates RAE
`/en/` with real English titles/descriptions, `hreflang`, `Organization` schema, capability pages, publications and a contact form; no Thai-only titles (`D-14`).

### J6 — Editor publishes an announcement
Login to CMS → choose content type (news / announcement / procurement / event) → Thai fields required, English optional-but-flagged → upload documents (auto metadata) → review by section owner → schedule → publish → auto-post to news list + sitemap + RSS.

**Success metric:** median publish time ≤ 10 min; 0 pages without owner/date.

---

## 5. Homepage wireframe

Grid: 12 columns · container 1280 px · gutter 24 · mobile margin 16. Heights are guidance, not fixed.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SKIP LINK (visible on focus)                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ UTILITY BAR  h=40  bg=green-900  text=green-100  13px                        │
│ แม่โจ้ · MJU Mail · ERP   │  ค้นหา   │  ไทย/EN   │  บุคลากรเข้าสู่ระบบ        │
├──────────────────────────────────────────────────────────────────────────────┤
│ HEADER  h=80 (sticky on scroll-up)                                           │
│ [emblem 48] สำนักวิจัยและบริการวิชาการ   │ nav 7 │ 🔍 │ TH│EN        │
│             The Office of Agricultural Research and Extension, Maejo Univ.  │
├──────────────────────────────────────────────────────────────────────────────┤
│ HERO  single message, no autoplay · 420 px desktop (min 320 / max 480) · 4:3 crop ≈ 292 px mobile
│ eyebrow: เปิดรับข้อเสนอทุนวิจัย ปีงบประมาณ 2570                               │
│ H1: งานวิจัยและบริการวิชาการ เพื่อเกษตรกรและสังคมไทย                          │
│ sub: 1 บรรทัด (≤ 120 ตัวอักษร)                                               │
│ [ ขอรับทุนวิจัย ]  [ ดูประกาศทั้งหมด ]                                        │
│ media: ภาพแปลงทดลอง/นักวิจัย (WebP+AVIF, มี alt, ไม่มีข้อความในภาพ)           │
├──────────────────────────────────────────────────────────────────────────────┤
│ AUDIENCE TILES  h=112  6 tiles (6-up desktop · 3-up 768–1023 · 2-up < 768)    │
│ นักวิจัย │ บุคลากรสำนักฯ │ เกษตรกร │ ชุมชน/ท้องถิ่น │ ผู้ประกอบการ │ ประชาชน  │
├──────────────────────────────────────────────────────────────────────────────┤
│ PRIORITY ACTIONS  h=96  "ทำบ่อย" 4 items + status badge                      │
│ ขอรับทุนวิจัย · ขอรับบริการวิชาการ · ค้นหาองค์ความรู้ · ติดตามประกาศ/จัดซื้อ   │
├──────────────────────────────────────────────────────────────────────────────┤
│ NEWS (8 col) + ANNOUNCEMENTS (4 col)                                         │
│ ┌ featured story (16:9, chip, H2, 2-line excerpt, date) ┐ ┌ ประกาศ ล่าสุด 5 ┐│
│ ┌ 2 small cards ┐                                        ┌ จัดซื้อจัดจ้าง 3 ┐│
│ [ ดูข่าวทั้งหมด ]                                        [ ประกาศทั้งหมด ]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ IMPACT STRIP  h=140  bg=green-50  4 stats + source/date line                 │
│ 120+ โครงการ · 45 ชุมชน · 30 หลักสูตร/ปี · 2 วารสาร (ตัวเลขต้องมีแหล่งอ้างอิง)│
├──────────────────────────────────────────────────────────────────────────────┤
│ EXTENSION SPOTLIGHT  h=360  2-col: case study (image+quote) | services list  │
├──────────────────────────────────────────────────────────────────────────────┤
│ KNOWLEDGE & MEDIA  h=320  3 cards: องค์ความรู้ · พันธุ์พืช-สัตว์ · วิดีโอ      │
├──────────────────────────────────────────────────────────────────────────────┤
│ EVENTS  h=220  next 3 events (date block, title, place, add-to-calendar)     │
├──────────────────────────────────────────────────────────────────────────────┤
│ SYSTEMS (P-12)  h=260  bg=green-50  6 cards + [ ดูระบบทั้งหมด 20+ ]           │
├──────────────────────────────────────────────────────────────────────────────┤
│ DIRECTOR  h=280  portrait 96 | ข้อความ 2–3 บรรทัด | [อ่านสารผู้อำนวยการ]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ FOOTER  4 columns + legal row + ปรับปรุงล่าสุด 24 ต.ค. 2569                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Homepage content rules**

| Slot | Max | Rule |
|---|---|---|
| Hero | 1 story | one message, one primary CTA; no autoplay; 420 px desktop / 4:3 mobile; update monthly at most |
| Audience tiles | 6 | fixed set; 2-up on mobile; label + 1-line "what you can do" |
| Priority actions | 4 | derived from the task ranking in §2 (to be validated against analytics after launch); each links to a landing page — no internal-system-only shortcuts |
| News | 3 + 1 featured | ≤ 90 days old or archived; category chip required |
| Announcements | 5 | pinned first; procurement and jobs in separate lists |
| Impact stats | 4 | each number carries `แหล่งที่มา · ณ วันที่` |
| Events | 3 | hidden entirely if none upcoming (empty state, not placeholder) |
| Systems | 6 + "all" | only tools with a confirmed owner |
| Director | 1 | no auto-rotating messages |

**Target density:** ≤ 4,800 px at 1440 wide and ≤ 6,500 px at 412 wide (`D-12`: today 11,953 px). No carousel, no text baked into images.

---

## 6. Page templates

| ID | Template | Purpose | Key components | Required fields |
|---|---|---|---|---|
| T1 | Homepage | orientation | hero, tiles, actions, news, stats, systems | — |
| T2 | Section landing | `/research/`, `/extension/`, `/knowledge/` | intro 2 lines, sub-section cards, "บริการที่เกี่ยวข้อง", contact owner | description, owner |
| T3 | Content page | history, governance, standards | breadcrumb, `h1`, rich text, TOC for >3 sections, last-updated | title, description, owner, review date |
| T4 | News / announcement | time-bound content | hero image, meta row, body, documents, share, related, contact | category, publish date (BE), image alt |
| T5 | Service page | `/extension/services/*` | summary box (who / what / fee / duration), steps, documents, CTA | audience, fee, contact |
| T6 | Document library | forms, handbooks, e-books | filter (type/year/unit), document rows, count | file, size, type, year |
| T7 | Directory | staff, experts, systems | search + filters, cards/rows, pagination | name, role, unit, expertise/owner |
| T8 | Search results | `/search/?q=` | grouped results, filters, count, no-result help | — |
| T9 | Contact | `/contact/` | address, map (static + link), phone, email, hours, One Stop Service, form | — |
| T10 | Error | 404/500 | apology, search, top links, contact | — |
| T11 | Accessibility statement | `/accessibility/` | conformance level, known limits, feedback channel | — |

**T4 news anatomy (replaces `wtms_newsDetail.aspx?nID=…`)**
`breadcrumb → category chip + BE date + reading time → h1 → summary → 16:9 image (alt, credit) → body (h2/h3 only) → attachments → contact box → share (copy link, Facebook, LINE) → related 3 → back to list`.
Adds what is missing today: share (`D-18`), related items (today only "ข่าวล่าสุด"), `NewsArticle` schema, `og:description`, canonical.

**T7 directory fields (PDPA-aware)** — public: name, academic title, position, division, expertise keywords, office phone, official e-mail, photo (consented). Never public: national ID, face-scan ID, personal mobile, home address, salary. Directory entries require written consent and support opt-out `[U]`.

---

## 7. Design system

### 7.1 Colour tokens (every ratio computed by `tools/contrast.py`)

| Token | Hex | Use | Contrast proof |
|---|---|---|---|
| `--green-900` | `#043D1F` | footer, utility bar, dark bands | white text **12.41:1**, `--green-100` text **10.94:1** |
| `--green-800` | `#076B35` | primary button, link hover | white **6.64:1** |
| `--green-700` | `#017F3F` | **brand** — headings, active nav, focus accents | white **5.11:1**; on `--green-50` **4.82:1** |
| `--green-600` | `#0A8F45` | decorative fills; text only at ≥ 24 px regular or ≥ 18.66 px bold (AA-large, 3:1) | white **4.18:1** — never for body text |
| `--green-100` | `#E6F4EC` | chips, table zebra | `--ink` on it ≥ 15:1 |
| `--green-50` | `#F3FAF6` | section background | `--ink` **16.74:1**, `--muted` **5.66:1** |
| `--ink` | `#111827` | body text | on white **17.74:1** |
| `--ink-2` | `#374151` | secondary headings | **10.31:1** |
| `--muted` | `#5B6470` | metadata, captions | **6.00:1** |
| `--muted-2` | `#6B7280` | disabled/secondary only | **4.83:1** |
| `--line` | `#DCEFE3` | decorative dividers only | non-semantic |
| `--line-strong` | `#84978C` | input borders, chart axes (UI ≥ 3:1) | **3.09:1** |
| `--amber-100` | `#FFE9A8` | "เปิดรับ" badge background | `--ink` **14.76:1** |
| `--amber-700` | `#8A5A00` | warning text | on white **5.93:1** |
| `--info` | `#1E5AA8` | informational | white **6.81:1** |
| `--danger` | `#A4232B` | destructive/error | white **7.36:1** |
| `--focus` | `#0A8F45` + 2 px white offset | focus ring on light | ring visible on `--green-50` and white |
| `--focus-on-dark` | `#FFE9A8` | focus ring on `--green-900` | > 10:1 |

**Rule:** the quick-access tiles that fail today (orange `#FF9800` 2.16:1, cyan `#17A2B8` 3.04:1, blue `#2196F3` 3.12:1, green `#28A745` 3.13:1, red `#FF0000` 4.00:1 — `D-07`) are replaced by **white cards with a coloured 4 px left rule and an icon**, so colour carries no text.

### 7.2 Typography

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--fs-display` | 40 / 50 (mobile 32 / 44) | 700 | hero |
| `--fs-h1` | 32 / 44 | 700 | page title |
| `--fs-h2` | 28 / 40 | 700 | section |
| `--fs-h3` | 22 / 34 | 600 | card title |
| `--fs-h4` | 18 / 30 | 600 | sub-heading |
| `--fs-body-lg` | 18 / 32 | 400 | lead paragraph |
| `--fs-body` | 16 / 28 | 400 | body (**1.75 line-height for Thai**) |
| `--fs-sm` | 14 / 24 | 400 | metadata, table cells |
| `--fs-xs` | 13 / 20 | 500 | chips, captions (never for paragraphs) |

- **Family:** `Sarabun` (Thai + Latin), self-hosted `woff2` subset, weights 400/600/700; fallback `Noto Sans Thai, system-ui, sans-serif`. Rationale: already used on the current site and across MJU properties, OFL-licensed, good loopless legibility at 14–16 px, and full Thai diacritic coverage. Reject novelty display faces (UTCC/DPU use one) — they cost weight and CLS for no readability gain.
- **No italics** for Thai (there is no true italic); use weight, colour or a left rule instead. Never uppercase Thai/Latin labels. `letter-spacing: 0` for Thai; `--tracking-tight` (−0.01em) for headings only.
- **Numerals:** Latin digits; dates rendered `6 ตุลาคม 2569`; money `1,250,000 บาท`; file sizes `1.2 MB`.
- **Line length:** 62–72 characters (`max-width: 68ch`); paragraphs ≤ 4 lines on desktop.

### 7.3 Spacing, grid, radius, elevation

| Token | Value | Token | Value |
|---|---|---|---|
| `--space-1…9` | 4, 8, 12, 16, 24, 32, 48, 64, 96 px | `--radius-sm` | 4 px (inputs, chips) |
| `--container` | 1280 px max, 24 px gutter (16 px < 768) | `--radius-md` | 8 px (cards) |
| `--grid` | 12 columns | `--radius-lg` | 12 px (media, modals) |
| Breakpoints | **360, 480, 768, 1024, 1280, 1440** (six only) | `--radius-pill` | 999 px |
| `--shadow-sm` | `0 1px 2px rgba(4,61,31,.08)` | `--shadow-md` | `0 4px 12px rgba(4,61,31,.10)` |
| `--shadow-lg` | `0 12px 32px rgba(4,61,31,.14)` | `--border` | `1px solid var(--line)` |

Rejected: DPU's 13 bespoke `min-width` breakpoints and RAE's 11 font sizes — both are symptoms of design-by-adjustment.

### 7.4 Motion

`--dur-fast 120ms`, `--dur-base 200ms`, `--dur-slow 300ms`, `--ease standard cubic-bezier(.2,0,.2,1)`. No autoplay carousels anywhere; scroll-snap galleries are user-driven. All animation wrapped in `@media (prefers-reduced-motion: reduce) { none }`. No parallax, no scroll-jacking.

### 7.5 Iconography & imagery

- Icons: one family, 24 px grid, 1.75 px stroke, 2 sizes (20/24); no emoji as UI icons; icons always paired with text.
- Photography: real Maejo/RAE work; 16:9 for cards (800×450), 3:2 for features (1200×800), 21:9 hero (1600×686) with a mobile 4:3 crop via `<picture>`.
- **No text inside images** (`D-10`). Alt text is mandatory and describes purpose, not file name. Decorative images `alt=""`.
- Formats: AVIF → WebP → JPEG fallback; `srcset` at 480/800/1200/1600; LQIP blur placeholder; `width`/`height` always set (CLS = 0).

---

## 8. Component inventory

| # | Component | Variants / states | Notes |
|---|---|---|---|
| 1 | SkipLink | focus-only | first focusable element |
| 2 | UtilityBar | default, condensed-on-scroll | 13 px, `--green-900` |
| 3 | SiteHeader | transparent-on-hero, solid-after-scroll | sticky **on scroll-up only** |
| 4 | MegaMenuPanel | 2–3 col, featured slot | `aria-expanded`, `Esc`, arrow keys |
| 5 | MobileDrawer | closed/open, nested 2 levels | focus trap, 44 px rows |
| 6 | SearchTrigger / SearchField | closed, typing, loading, results, empty | Thai-tolerant (see §11) |
| 7 | Hero | image, image+caption, `--dark` | 1 CTA primary + 1 secondary |
| 8 | AudienceTile | default, hover, active | icon + label + 1-line |
| 9 | PriorityAction | default, with badge (`เปิดรับ`,`ปิดรับ`,`ใหม่`) | max 4 |
| 10 | NewsCard | default, featured, compact-row | title clamp 2, `--fs-h3/--fs-sm` |
| 11 | NewsFilter | chips, count, clear-all | URL-synced state |
| 12 | AnnouncementRow | default, pinned | date first (BE) |
| 13 | ImpactStat | default | number + label + source |
| 14 | EventItem | default, past | add-to-calendar (`.ics`) |
| 15 | FeatureBand | image-left, image-right | case study / spotlight |
| 16 | SystemCard | default, `SSO`, `ปิดปรับปรุง` | name, owner, audience badge |
| 17 | DocumentItem | pdf/doc/xls/zip, `ใหม่` | title, meta, size, updated |
| 18 | Breadcrumbs | 2–4 levels | `aria-current` |
| 19 | Tabs | horizontal, overflow-scroll | `role=tablist`, arrow keys |
| 20 | Accordion | single/multi | FAQ uses this + `FAQPage` schema |
| 21 | Callout | info/warning/success/error | icon + text, no colour-only meaning |
| 22 | Table | default, responsive card mode | real `<table>` with `<th scope>` |
| 23 | Pagination | numbered, load-more | `rel=next/prev` |
| 24 | PersonCard | staff, expert | PDPA consent flag |
| 25 | FormField + Form | text, select, file, consent | visible label, `aria-describedby` errors, 44 px |
| 26 | StepList | service process | numbered, semantic `<ol>` |
| 27 | ShareBar | copy, Facebook, LINE | native share on mobile |
| 28 | VideoFacade | poster → iframe on click | removes 4 embeds from critical path (`D-13`) |
| 29 | Footer | 4-col, compact | legal row |
| 30 | CookieConsent | banner, preferences modal | PDPA, accepts/declines analytics |
| 31 | EmptyState / ErrorState | 404, 500, no-results | search + top links |
| 32 | LangSwitch | TH/EN, current marked | `hreflang` pair |
| 33 | Toast / Alert | success, error | `role=status` / `role=alert` |
| 34 | BackToTop | appears > 2 screens | reduced-motion aware |

---

## 9. Accessibility plan (WCAG 2.2 AA)

### 9.1 Fixes mapped to measured defects

| Defect | Fix | Acceptance test |
|---|---|---|
| `D-04` no `lang` | `<html lang="th">`; English pages `lang="en"`; inline English spans `lang="en"` | DOM assertion + NVDA |
| `D-05` no `h1` | exactly one `h1` per page; no skipped levels | `tools/cdp_a11y.mjs` heading check = 0 issues |
| `D-06` layout tables, no landmarks | semantic `header/nav/main/footer`; tables only for tabular data with `<th scope>` | landmarks = 1/1/1/1 |
| `D-07` contrast | §7.1 tokens; colour never sole carrier | 0 AA failures in probe |
| `D-16` unnamed links / missing alt | accessible-name lint in CI; alt required by CMS | 0 unnamed links, 0 missing alt |
| `D-12` mobile length | progressive disclosure (tabs→accordion, "ดูทั้งหมด" pages) | home ≤ 6,500 px @ 412 |
| taps < 24 px | 44×44 minimum for nav/buttons/icon links | probe `under24 = 0` in primary nav |
| `D-01` 404 link | remove/replace; automated link check weekly | 0 dead links |
| `D-21` mobile nav trigger | labelled button (`aria-label="เมนูหลัก"`), `aria-expanded`, drawer with focus trap and `Esc` | keyboard-only test on 412 px |

### 9.2 Requirements

- **Focus:** visible 2 px ring + 2 px offset on every interactive element, including inside dark bands; `:focus-visible` supported; no `outline: none` without replacement.
- **Keyboard:** skip link, logical tab order, `Esc` closes overlays, menus reachable without hover, carousels (if any) have pause/next/prev buttons.
- **Forms:** programmatic labels, `aria-describedby` for help/error, error summary at top, inline errors with `role="alert"`, required marked in text (not only colour).
- **Media:** captions for videos (Thai), transcripts for audio, `poster` on all video.
- **Zoom/reflow:** usable at 200 % zoom and 320 px width without horizontal scroll (fixes `D-17` 4 px overflow); never set `maximum-scale`/`user-scalable=no` (UTCC anti-pattern).
- **Motion:** honour `prefers-reduced-motion`; no autoplay > 5 s.
- **Timing:** no session timeouts on public pages.
- **Language of parts:** Thai page with English institution name marked up.
- **PDF/docs:** accessible PDF (tagged, real text) or an HTML alternative; announce file type + size.
- **Statement:** publish `/accessibility/` with conformance level, known limitations and feedback channel.
- **Testing:** automated (axe-core in CI) + manual keyboard + one screen-reader pass per release + contrast checks via `tools/contrast.py`.

---

## 10. SEO plan

| Area | Rule |
|---|---|
| Title | `{Page} | สำนักวิจัยและบริการวิชาการ มหาวิทยาลัยแม่โจ้` ≤ 60 chars; news: `{Headline} | ข่าว RAE` |
| Description | 120–155 chars, Thai, action-oriented, unique per page; never empty (today: empty on wID pages, `D-08`) |
| H1 | exactly one; mirrors the page intent, not the logo |
| Canonical | self-referencing on every page, both locales |
| hreflang | `th` / `en` / `x-default`, reciprocal, only on real translations (`D-14`) |
| Structured data | `GovernmentOffice`+`Organization` (site-wide), `WebSite`+`SearchAction`, `BreadcrumbList`, `NewsArticle` (news), `FAQPage` (FAQ), `Event` (events), `Person` (directory, consented), `Dataset` (research DB) |
| `robots.txt` | allow all public sections; `Sitemap:` line; block `/wtms_admin*`, `/search/`, `?s=` duplicates |
| Sitemap | `sitemap_index.xml` → `pages`, `news`, `documents`, `people`, `en`; `lastmod` from CMS |
| URLs | stable Latin slugs; no `wID`/`nID`; no parameters for taxonomy |
| Internal links | every page reachable ≤ 3 clicks from home; section landing pages link down and across |
| News archiving | `/news/page/n/`, `rel=prev/next`; old news stays indexed |
| Documents | indexable HTML wrapper page per document (title, abstract, metadata); PDF `X-Robots-Tag` consistent |
| Social | `og:title/description/image` (1200×630) per page; Twitter card `summary_large_image` |
| Freshness | `dateModified` visible as `ปรับปรุงล่าสุด` |
| Migration | 301 map + Search Console change-of-address monitoring + 4-week crawl diff |
| Thai keywords | research: `ทุนวิจัย`, `ข้อเสนอโครงการ`, `จริยธรรมการวิจัย`, `ตีพิมพ์`, `วารสาร`; extension: `บริการวิชาการ`, `อบรมเกษตร`, `เกษตรอินทรีย์`, `คลินิกเทคโนโลยี`; institution: `สำนักวิจัย มหาวิทยาลัยแม่โจ้` |
| Performance as SEO | Core Web Vitals budget in §12 |

---

## 11. Search design (new capability)

- **Scope:** pages, news/announcements/procurement, documents (title + extracted text), people/experts, systems.
- **Thai handling:** no word-space assumption — use n-gram/tokenised indexing (e.g. Elasticsearch Thai analyzer, Typesense with CJK/Thai tokenizer, or Postgres `pg_trgm` as a minimum) `[U]` pending infra decision.
- **Syntax:** typo tolerance (1 edit), synonyms dictionary (`ทุน` = `money/grant`, `อบรม` = `training`), filters by type/year/unit, sort by relevance then recency.
- **UI:** header field → `/search/?q=`; grouped results with counts; "ไม่พบผลลัพธ์" state offers top tasks + contact.
- **Analytics:** log zero-result queries monthly; they are the content backlog.
- **Empty/edge:** no results must never be a dead end.

---

## 12. Performance budget

| Metric | Budget | Today (`[V]`) |
|---|---|---|
| HTML per page | ≤ 100 KB | 150 KB (home); 167 KB (`/wtms_news.aspx`) |
| Initial transfer | ≤ 800 KB | 2.78 MB |
| Requests | ≤ 60 | 59 (but 4 heavy iframes) |
| LCP (4G, mid Android) | ≤ 2.5 s | `load` 7.6 s |
| CLS | ≤ 0.1 | not measured `[U]` |
| INP | ≤ 200 ms | not measured `[U]` |
| Fonts | ≤ 2 files, ≤ 90 KB total, `font-display: swap`, preload | custom `myFont` + Sarabun, unsubsetted |
| JS | ≤ 180 KB gzip, no jQuery | jQuery 3.5.1 + Bootstrap bundle |
| Images | AVIF/WebP, `srcset`, lazy below fold | 27 images, 6 lazy |
| Third-party | analytics only, consent-gated; video facades | 4 YouTube embeds + GA4 on load |

Tactics: server-rendered HTML (no client framework needed for content), critical CSS inline, `Cache-Control: public, max-age=31536000, immutable` for hashed assets (today `private`), Brotli, HTTP/2+, `<link rel=preload>` for hero image and 1 font, YouTube via facade.

---

## 13. Content governance

### 13.1 Content types and required metadata

| Type | Fields | Owner |
|---|---|---|
| Page | title, description, section, owner, reviewed date, Thai body, EN body (optional) | section head |
| News | headline, category, publish date (BE), lead image + alt + credit, summary, body, contact, tags | communications officer |
| Announcement | title, type, effective date, expiry, attachments, issuing unit | division secretary |
| Procurement | title, method, round, winner, value, publish date, documents | procurement officer |
| Event | title, start/end, venue, registration link, calendar export | training coordinator |
| Document | title, category, year, file, size, abstract | librarian/owner |
| Person | name, title, position, unit, expertise, phone, e-mail, consent, photo | HR liaison |
| System | name TH/EN, owner, audience, SSO yes/no, URL, status | IT liaison |

### 13.2 Workflow

`draft → unit review → section head approval → publish (scheduled) → review reminder every 12 months → archive`.
Roles: **Editor** (unit), **Approver** (section head), **Publisher** (comms), **Admin** (systems). Two-person rule for announcements and procurement.

### 13.3 Editorial rules

- Thai-first, plain language; lead paragraph answers *who / what / when / where / how to act* in ≤ 3 sentences.
- Dates: BE full form; every news item shows a date; every page shows `ปรับปรุงล่าสุด`.
- Titles: 40–70 chars, no clickbait, no `!!!`.
- Images: real photos, consent for identifiable people, alt required, no text in image.
- Links: descriptive text (never `คลิกที่นี่`); external links flagged with `(เปิดในแท็บใหม่)`.
- Attachments: accessible PDF ≤ 5 MB, announce size and type.
- English: only publish `/en/` when the page is genuinely translated; machine translation must be edited (never ship `lang="th"` titles on `/en/`).
- Archive policy: news older than 3 years stays online but out of homepage rotation.

---

## 14. Internal systems boundary

| System | Host | Keep as-is | Public page role |
|---|---|---|---|
| ERP / finance | `erp.mju.ac.th` | ✅ | directory entry `ต้องเข้าสู่ระบบ` |
| MJU Mail / M365 | `office.com` | ✅ | utility link |
| IRB / ethics | `irb.mju.ac.th` | ✅ | `/research/ethics/` explains + links |
| Research database | `researchex.mju.ac.th` | ✅ | `/research/database/` explains + links |
| Knowledge base | `kb.mju.ac.th` | ✅ | `/knowledge/articles/` index |
| Germplasm DB | `sciencebase.mju.ac.th` | ✅ | `/knowledge/germplasm/` |
| Journal | `li01.tci-thaijo.org` | ✅ | `/research/publications/` |
| Maejo Vision | `maejovision.mju.ac.th` | ✅ | `/knowledge/media/` |
| RSPG / Royal projects | `rspg.mju.ac.th`, `royal.mju.ac.th` | ✅ | section landing pages |
| Face-scan, leave, rooms, vehicles, advances, IDP, photo request | internal web apps | ✅ | `/systems/` cards only; **no public deep links to personal-data functions** `[U]` |
| Google-hosted forms/sites (two unmanaged third-party app domains (names withheld), `docs.google.com`) | external | ⚠️ governance review | list only after ownership confirmed |

**Principle:** the RAE website is the *front door and directory*, never the identity provider. No credentials, no embedded admin UI, no personal data beyond an official, consented directory.

---

## 15. Delivery roadmap (blueprint only — no implementation in this phase)

| Phase | Scope | Duration | Exit criteria |
|---|---|---|---|
| **0. Quick wins on current site** | fix 404 link, remove admin link from utility bar, add `lang`+`h1`+meta description+canonical, `robots.txt`+sitemap, replace 4 YouTube embeds with facades, contrast-fix quick-access tiles | 2–3 weeks | every `S1` defect that does **not** require the new platform is closed (`D-01`, `D-03`, `D-04`, `D-05`, `D-07`, `D-19`; `D-06` improved, full landmark/table rework lands in Phase 2). `D-02` (search) is explicitly deferred to Phase 2 |
| **1. Foundations** | platform/hosting decision + content model, design tokens, 34 components, T1/T2/T3/T4/T10 templates, TH/EN routing, CI (axe, links, Lighthouse budget) | 4–6 weeks | decision gate §TECHNICAL_OPTIONS closed; component library reviewed; a11y pass on T1–T4 |
| **2. Section build-out** | all 7 sections (`/about`, `/research`, `/extension`, `/knowledge`, `/news`, `/systems`, `/contact`), search, documents, events, forms | 6–8 weeks | 7 sections live; search returns grouped results; 0 dead links |
| **3. Migration & redirects** | inventory all `wID`/`nID`, map, migrate top 100 pages + news archive, `redirects.csv` | 6–10 weeks | 100 % of top-100 pages mapped; crawl diff clean; rankings monitored |
| **4. English parity + governance** | `/en/` for 15 pages, editorial workflow, analytics dashboard, review cadence | 4 weeks + ongoing | `hreflang` validated; 90 % pages have owner + review date; 15 EN pages published |

**Dependencies:** IA sign-off → content inventory export → design system → templates → migration. Search needs the IA and the sitemap. English parity needs a translator decision.

### Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | WTMS/WebForms cannot produce clean URLs or components | High | Phase 0 mitigates; Phase 1+ requires a new front end (see `TECHNICAL_OPTIONS.md`) |
| R2 | No named content owners | High | owner field is mandatory at publish; RACI signed before Phase 2 |
| R3 | Thai/English translation capacity | Medium | publish EN only when translated; flag untranslated pages |
| R4 | Organic traffic loss during migration | High | 301 map, staged rollout, Search Console monitoring, keep old URLs 12 months |
| R5 | Photo/asset rights for heroes | Medium | use RAE-owned photos; model release for identifiable people |
| R6 | Shadow-IT domains (`*.net` Google apps) | Medium | governance review before listing; no public deep links |
| R7 | PDPA exposure in staff directory | High | consent + minimal fields + opt-out + retention policy |
| R8 | SSO expectations | Medium | documented Entra ID OIDC only; do not reverse-engineer undocumented flows |
| R9 | Accessibility regression after launch | Medium | axe-core in CI + manual pass per release |
| R10 | Scope creep (portal/app) | High | non-goals in §1 enforced by change control |

### KPIs

| KPI | Baseline | Target (6 months) |
|---|---|---|
| Top-task completion (moderated, n≥10) | `[U]` | ≥ 85 % |
| Search success (click-through on result) | none (no search) | ≥ 60 % |
| Zero-result queries | n/a | ≤ 10 % |
| Homepage mobile height | 11,953 px | ≤ 6,500 px |
| LCP (mobile, 4G) | load 7.6 s | ≤ 2.5 s |
| WCAG AA contrast failures | 14 | 0 |
| Pages with owner + review date | 0 | 100 % |
| EN coverage of top-15 pages | partial | 100 % |
| News freshness (median age of home items) | `[U]` | ≤ 21 days |

---

## 16. What this blueprint deliberately does **not** do

- It does not choose a vendor, sign a contract, or change hosting.
- It does not implement, deploy, or modify `rae.mju.ac.th`.
- It does not design the authenticated staff portal, ERP screens or any internal application.
- It does not copy reference-site code, CSS or assets.
- It does not assume unverified facts: items marked `[U]` in `REFERENCE_AUDIT.md §8` must be answered by the owners before Phase 1.
