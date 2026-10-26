# License recommendation — rae-digital-platform

> **Decision taken 2026-10-26 (owner).** Apache-2.0 is approved for the **original source code
> only**, with institutional assets excluded until separately authorised. The policy was restated
> in four clauses (A1–A4) and is implemented in [NOTICE](../../NOTICE) parts A/B/C, which separate
> the owner's declaration from independently verified facts and from the authority that remains
> unresolved. It is implemented in
> [LICENSE](../../LICENSE) (Apache-2.0, verbatim from apache.org), [NOTICE](../../NOTICE) (scope,
> exclusions, unresolved-authority statement) and the per-asset register in
> [ASSET_RIGHTS.md](ASSET_RIGHTS.md).
>
> Still **unresolved**: (a) whether Maejo University holds rights in the code through a written
> employment/IP agreement — no such document exists in this repository; (b) written permission for
> the photographs, news text and translations; (c) insignia rules for the university seal. `NOTICE`
> states all three openly so the licence cannot be misread as covering them.

Proposal only. Nothing here has legal force until the repository owner and the office approve
it and the copyright holder is named. Evidence read on 2026-10-26 from `main` @ `67969f1`
(a parallel branch `feat/brand-emblem` carries the owner-supplied Maejo seal and is not merged).

**Independently re-verified before this file was committed** (2026-10-26):
`ls LICENSE* COPYING*` → none · `package.json.private` → `true` · footer renders
`สงวนลิขสิทธิ์` (`content/th/site.ts:129`) · `package-lock.json` → **443** packages,
**zero** GPL/AGPL, spread `MIT 348, Apache-2.0 34, ISC 18, MPL-2.0 13, LGPL-3.0-or-later 10,
BSD-2-Clause 7, BlueOak-1.0.0 3, Apache-2.0 AND LGPL-3.0-or-later 3`.

## 1. Current state

| Fact | Evidence (verified) |
|---|---|
| No licence file of any kind | `ls LICENSE* COPYING*` at repo root → not found |
| `package.json` says `"private": true` | stops accidental `npm publish`; grants or reserves nothing about reuse |
| Public repository, publicly deployed | `.github/workflows/pages-preview.yml` deploys a GitHub Pages preview |
| Footer already asserts copyright | `components/site-footer.tsx` renders `© {year} {orgFull}, {orgUniversity}` + `สงวนลิขสิทธิ์` |
| GitHub reports no licence | `docs/PROVENANCE.md §5` records `license: null` |

**What "no LICENSE" legally means.** Default copyright applies: the public may view and fork
the repository — that is all GitHub's Terms of Service grant — and may not reproduce,
distribute or create derivative works. See
[GitHub: Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
and the [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service).
A fork right is not a reuse right: nobody may take this code into another unit's site.

**Where copyright sits is unresolved, and the intuitive answer is wrong under Thai law.**
Under the Copyright Act B.E. 2537 (1994) s.9, copyright in a work created in the course of
employment vests in the **author** unless otherwise agreed **in writing**, while the employer
gets the right to communicate the work to the public for the purpose of the employment; s.10
puts commissioned works with the hirer
([Act text, IP Thailand](https://www.ipthailand.go.th/images/3534/2564/Copyright/Copyright_Act_ENG.pdf)).
No assignment, employment-IP clause or university IP regulation is present in this repository,
so:

- on the statutory default, the individual staff author holds copyright in the code and the
  university holds at most a publication right;
- whether an assignment or regulation overrides that is **not verifiable from this repository**;
- the footer already makes a public copyright claim in the university's name, and nothing in the
  repo documents the assignment that would support it.

## 2. Provenance inventory — what is not the owner's to license

Verified by reading the files and their own provenance comments, not assumed.

| Path | What it is | Origin | Relicensable by the repo owner? |
|---|---|---|---|
| `app/`, `components/`, `lib/`, `scripts/`, `tests/` | routes, layout, header/footer, pagination, i18n, gates | written in this repo, no third-party file headers | Yes, subject to §1 |
| `content/th/*.ts` | all Thai copy on the site | transcribed verbatim from `rae.mju.ac.th` (comments at the top of each file) | No — the office's text |
| `content/en/*.ts` | English equivalents | translations of the above (ADR-0005) | No — a translation is an adaptation, s.11 |
| `public/images/news/*.webp` (162 files, ~7.6 MB) | lead images per news item, three sizes | downloaded from the official news pages, 2026-10-25 (`public/README.md`) | No |
| `public/images/about/{rae-logo.png,office-building.webp,office-annex.webp}` | RAE emblem, two building photographs | downloaded from `rae.mju.ac.th/wtms_about.aspx` | No |
| Maejo seal `public/images/brand/mju-emblem-*.png`, `app/icon.png` | university emblem | supplied by the owner (branch `feat/brand-emblem`) | No — governed by the university's insignia rules, not a code licence |
| `design/stitch/stitch-landing-v2.reference.html` | single-file landing prototype | generated by Google Stitch from an RAE brief; images point at `lh3.googleusercontent.com` (`design/stitch/README.md`) | Unclear — exclude from any licence |
| `app/globals.css` tokens; section order in `app/[locale]/page.tsx` | colours and layout derived from that reference | comments at the top of both files | Yes, with disclosure — colour values and layout ideas are not protected expression (s.6) |
| `docs/**` | architecture, research, evidence, reports | written by the team or imported from its own research workspace | Yes — separate decision if docs get their own licence |
| Sarabun webfont | body typeface, self-hosted by `next/font` | Google Fonts, OFL | Yes — already OFL, keep its notice |

Original code: `app/`, `components/`, `lib/`, `scripts/`, `tests/`. Not original: **all**
Thai/English copy, **all** photographs, the RAE emblem, the Maejo seal, and the Stitch
prototype. The office's own site publishes no copyright or terms-of-use statement (fetched
2026-10-26), which does not make the content free — it only means no permission is documented
there either.

## 3. Dependency licence audit

Method — read the installed tree from the lockfile, spot-checked against `node_modules/*/LICENSE`:

```bash
node -e 'const p=require("./package-lock.json").packages;
for(const[k,v]of Object.entries(p))if(k)console.log(k.replace("node_modules/",""),v.version,v.license||"UNKNOWN",v.dev?"dev":"prod")'
```

Lockfile v3, **443 packages: 54 production, 389 development**. Direct dependencies:

| Package | Version | Licence |
|---|---|---|
| next | 16.4.3 | MIT |
| react / react-dom | 19.3.1 | MIT |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | MIT |
| typescript | 5.8.3 | Apache-2.0 |
| eslint | 10.13.0 | MIT |
| eslint-config-next | 16.4.3 | MIT |
| @types/node | 22.20.5 | MIT |
| @types/react / @types/react-dom | 19.3.0 | MIT |

Key transitive packages:

| Package | Version | Licence | Note |
|---|---|---|---|
| @next/swc-* (8 platform binaries) | 16.4.3 | MIT | Next compiler |
| sharp | 0.35.5 | Apache-2.0 | optional dep of next; unused here because the Pages build sets `images.unoptimized` |
| @img/sharp-libvips-* (10 platform binaries) | 1.3.4 | LGPL-3.0-or-later | the only copyleft in the production tree; prebuilt native binaries, consumed unmodified, not shipped in the static output |
| @img/sharp-wasm32 / win32-* | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | same family |
| lightningcss (+11 platform packages) | 1.32.0 | MPL-2.0 | build-time CSS transform via Tailwind; dev only |
| axe-core | 4.14.0 | MPL-2.0 | pulled in by eslint-plugin-jsx-a11y (dev only) |
| caniuse-lite | 1.0.30001819 | CC-BY-4.0 | browser data; attribution if redistributed |
| minimatch (3 copies) | 10.2.6 | BlueOak-1.0.0 | dev only |
| tslib | 2.8.1 | 0BSD | |
| source-map-js | 1.2.2 | BSD-3-Clause | |

**Verdict.** No GPL and no AGPL anywhere (`/GPL/i && !/LGPL/i` over every `license` field
returns zero). Nothing copyleft reaches this repository's source: LGPL appears only in prebuilt
libvips binaries behind `sharp` (a separate, dynamically linked program, and not exercised by
the static export); MPL-2.0 only in build tooling consumed unmodified and not shipped. Every
licence is compatible with releasing this repo under MIT or Apache-2.0. *Limitation:* values are
the `license` fields in `package-lock.json`, cross-checked against six installed `LICENSE` files
(next, typescript, sharp, lightningcss, axe-core, caniuse-lite); the remaining 437 were not
opened individually.

## 4. Option comparison

| | Apache-2.0 | MIT | No licence (today) |
|---|---|---|---|
| Reuse granted | use, modify, distribute, sublicense, commercial use | same | none; view and fork only (GitHub ToS) |
| Patent grant | explicit, s.3, terminates on patent suit | none — silent on patents | none |
| Trademark | s.6 explicitly withholds trademark rights | silent; trademark law applies anyway | silent |
| Notice obligations | keep copyright + licence text, ship `NOTICE`, state changes in modified files | keep copyright + licence text | n/a |
| Copyleft | none | none | n/a |
| "University owns the content, code shared with other units" | works: another unit takes the code, keeps the NOTICE and marks its changes | works with less ceremony but no patent or trademark language | blocks it: each unit needs written permission from the individual author, who may not be the rights holder |
| Practical cost | a `NOTICE` file and a "changes" habit | one file | none now, indefinite ambiguity later |

Neither licence covers the university's marks or the copied official content. A `LICENSE` file
speaks only about the code it sits next to; the photographs, transcribed Thai copy, news text
and seal stay under the office's and the university's rights regardless. Any licence chosen must
be paired with an explicit exclusion notice, or it reads as a grant over material the owner
cannot license.

## 5. Recommendation

**Apache-2.0, scoped to source code only, plus a `NOTICE` that excludes content, images and
marks — added in one commit, after the decisions below are answered.**

Why Apache-2.0 over MIT: the explicit patent grant (s.3) is worth having for a platform other
university units may keep running for years; s.6's trademark carve-out matches the fact that the
seal must stay restricted; and the `NOTICE` mechanism is exactly the place to record "code
licensed, content and marks excluded", which MIT has no slot for. MIT remains an acceptable
fallback if the university wants the least paperwork — it is compatible with every dependency
here — but it would need a separate content notice anyway.

The licence must name a real copyright holder, and none can be named yet. Before a `LICENSE`
file is added, these must be decided:

1. **Who is the licensor** — the individual staff author, the office, or Maejo University — and,
   if the university, the written assignment or IP regulation that transfers it (s.9 requires writing).
2. **Does the office approve releasing the photographs, news text and translated copy** in a
   public repository under a code licence, or must they be excluded and fetched at build time?
3. **Is the seal shipped at all** — it is a university mark; a trademark notice at minimum, or
   remove it from the public repo.
4. **Do other units get the code under the same licence**, or under separate written permission?
5. **Who signs** the approval (office head / university IP or legal office), recorded in the repo.

## 6. What NOT to do

- Do not paste a `LICENSE` while content rights are unresolved. A licence on this tree would
  purport to grant rights over photographs and transcribed copy the owner does not hold.
- Do not imply university endorsement or approval of an open licence without written approval;
  the footer already speaks in the university's name.
- Do not relicense copied content — exclude `public/images/**`, `content/**` sources,
  `design/stitch/**` and the seal by path in the notice.
- Do not treat `"private": true` as a proprietary notice; it only prevents `npm publish`.
- Do not licence the seal, or leave it inside a directory a downstream user would reasonably
  read as licensed.
- Do not present the design tokens and layout as purely original; disclose the Stitch derivation.
- Do not add a per-file `SPDX-License-Identifier` sweep before the licensor is decided — it would
  bake in the wrong holder.

## 7. Open decisions

| Item | Who must decide | Why it blocks a LICENSE file |
|---|---|---|
| Copyright holder named in the licence | Owner + university IP/legal | A licence granted by a non-owner is ineffective; s.9 defaults to the individual author |
| Written assignment or IP-regulation reference | University (HR / legal) | Without it the footer's claim is unsupported and the grant unsafe |
| Release of photographs and news text | Office head (RAE) | Third-party content relative to the code; the licence cannot cover it |
| Release of English translations | Office head (RAE) | Adaptations under s.11 need the underlying right |
| Seal handling: trademark notice vs removal | University (registrar / communications) | Apache-2.0 and MIT grant no trademark rights |
| Intra-university reuse terms | Office head / university | Decides whether one licence suffices or separate permission is needed |
| Signature and date of approval | Owner | Turns this proposal into a documented decision |

Sources: [GitHub licensing docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) ·
[GitHub ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) ·
[Thai Copyright Act B.E. 2537 (English)](https://www.ipthailand.go.th/images/3534/2564/Copyright/Copyright_Act_ENG.pdf) ·
[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) ·
[choosealicense: Apache-2.0](https://choosealicense.com/licenses/apache-2.0/) ·
[choosealicense: MIT](https://choosealicense.com/licenses/mit/)
