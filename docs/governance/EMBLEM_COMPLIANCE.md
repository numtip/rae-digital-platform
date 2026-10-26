# Emblem compliance check — Maejo University official mark

**Date:** 2026-10-26 · **Assets under review:** `public/images/brand/mju-emblem-{96,192,256,512}.png`,
`mju-emblem-source.jpg`, `app/icon.png` (favicon), used in `components/site-header.tsx`,
`app/[locale]/about/page.tsx` and `app/global-not-found.tsx`.
**Status: PARTIAL — the official specimen could not be retrieved, so a pixel comparison against
the university's own artwork has NOT been made.**

## 1. What was attempted for the official sources

| Source | Result |
|---|---|
| `https://law.mju.ac.th/wtms_document.aspx?lang=th-TH` (the 2021 announcement index) | **HTTP 200**, page text ≈3,477 characters. Searching the page for `ตราสัญลักษณ์`, `เครื่องหมาย`, `โลโก้`, `logo` returned **0 matches** — it is a document index, not the announcement itself |
| The 8 documents linked from that index (`bID` 5281, 5283, 5459, 5680, 6078, 6079, 6080, 7306) | all fetched (HTTP 200, 2.2k–41.9k characters of text each). **None** of the eight contains an emblem keyword. The 2021 announcement about the university mark and the MJU Logo Guideline are **not among them** |
| MJU Logo Guideline | not located from the pages above; no link to a guideline PDF appears in the fetched documents |

**Consequence:** the "compare against the official specimen" step is **unfinished**, and this
document does not claim it was done. Everything below is a check of *our own processing* and of
the file the owner supplied — not a verification that our emblem matches the university's
official artwork.

## 2. What our processing did to the emblem (verified)

| check | result |
|---|---|
| licence/attribution text inside the emblem | untouched — the only pixels changed are those **outside** the ring radius (528 px from the measured centre 646,636) |
| lettering and colours inside the ring | preserved by construction: the mask sets alpha 0 outside the radius and leaves RGB/alpha inside unchanged; the centre pixel reads `53 149 101 255` (opaque) and the corners read `255 255 255 0` |
| gold rim | complete at every size; nothing clipped (checked on rendered sheets at 96/192/256/512) |
| proportions | all four sizes are square (96,96 / 192,192 / 256,256 / 512,512) — no stretching or squashing |
| favicon | `app/icon.png` 256×256 rgba, served as `/icon.png` (HTTP 200, 133,849 B on the live site) |
| live serving | `images/brand/mju-emblem-192.png` HTTP 200, 82,268 B; emblem present on every exported page |

## 3. The one deliberate removal — and why it complies with the owner's rule

The owner's rule: *preserve all official lettering and colours inside the emblem; remove obsolete
office wording only if outside the emblem.*

The supplied JPEG contains a **curved Thai caption outside the ring** reading *สำนักวิจัยและส่งเสริม
วิชาการการเกษตร* — the office's former name. It is:

- **outside** the emblem ring, and
- **obsolete**: this site uses the owner-approved current name สำนักวิจัยและบริการวิชาการ.

It is therefore masked out, which is exactly the case the rule permits. Nothing inside the ring was
removed or retouched.

## 4. Discrepancies recorded (not corrected — they need the official source)

| # | Observation | Needs |
|---|---|---|
| 1 | Our emblem derives from a **1280×1280 JPEG supplied by the owner**, not from the university's published master artwork. JPEG compression and a 1280 px ceiling could differ from the official master (colour values, stroke weights at small sizes) | the official vector/PNG master to compare against |
| 2 | At 48 px in the header the Thai lettering inside the ring is not legible (a physical limit of the size, not a defect of the file) | a university-sanctioned reduced/simplified variant if the office wants legible small use |
| 3 | The favicon is the full emblem downscaled to 256 px; the university guideline may specify a different small-size treatment | the guideline document |

No correction was made for any of the three: correcting them without the official specimen would be
guesswork, which the brief forbids.

## 5. Rights position (unchanged)

The emblem is **excluded from the Apache-2.0 grant**. It sits in `NOTICE` part A1 (Maejo University
material) and part B3 (the `public/images/brand/` tree plus `app/icon.png`), and in
`docs/governance/ASSET_RIGHTS.md` row 6 with status `EXCLUDED`. Apache-2.0 section 6 grants no
trademark or insignia right.

## 6. Permissions the university must give

| # | Permission | Why it is needed |
|---|---|---|
| 1 | Use of the university emblem on this public website | the office already publishes the mark on its own site, but this site is a separate publication channel |
| 2 | The mark being present in a **public GitHub repository** (source + distributed files), which is more than publishing it on a website | the repo is public and mirrored by forks on clone |
| 3 | Access to the **official specimen / Logo Guideline** so the comparison in §1 can be completed | to finish the compliance check and correct items in §4 |
| 4 | Whether a reduced-size variant is sanctioned for a 48 px header | to resolve discrepancy 2 |

Until 1–3 are answered, the emblem's use is recorded as **owner-supplied and unpublished-by-this-
project's-authority**, not as cleared.
