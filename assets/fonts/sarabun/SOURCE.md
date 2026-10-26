# Sarabun — self-hosted WOFF2, so the build needs no network

The website's typeface is Sarabun, by the Sarabun Project Authors (Cadson Demak),
licensed under the **SIL Open Font License 1.1**. The build used to download these from
`fonts.googleapis.com` through `next/font/google`, which made every build — and every CI run —
depend on Google being reachable.

## What is committed, and where it came from

The four weights the site actually uses are committed as **WOFF2**. They were converted from
the upstream TrueType originals fetched on 2026-10-26 from the canonical Google Fonts
repository, directory `ofl/sarabun`:

`https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-<Weight>.ttf`

| committed file (usWeightClass) | WOFF2 bytes | WOFF2 sha256 | upstream TTF bytes | upstream TTF sha256 |
|---|---|---|---|---|
| `Sarabun-Regular.woff2` (400) | 31,908 | `2397b09e6c7f633320ac4a28555521a943fba4754ce02614366feb2d61bc1b3f` | 90,220 | `226d4f368fbc0457990ddef2692679badfd2c1a4e89e5ac4d43c10ba7743b2f1` |
| `Sarabun-Medium.woff2` (500) | 32,500 | `61180dfc23a2e2ffb704a66b2be860eb9477203f2d59b54d739588c19ab332d3` | 90,292 | `cc7c3016daab3321674fdf6e2ef59850dc0c07503de1cbdb8b90fe8080ada2b4` |
| `Sarabun-SemiBold.woff2` (600) | 32,360 | `161466e5815c4f28018795fd20d081bff0e257d31f3e9877b4d0b28a588df453` | 90,200 | `c0bb057d86e4a12097d701ac0953597e315788d47a446f5b63a6604ab21dceba` |
| `Sarabun-Bold.woff2` (700) | 32,112 | `c711df7481e9e97dc2a8c3f76eb30c09fe07650c4caea9d12c7eaeb5d07903a8` | 89,804 | `d38308ca27d067b9a1b79006337c1f9a66c29aa016d96a9d88d3801da7fa83b9` |

Conversion, exactly as run (fontTools 4.67.0 with brotli):

```python
from fontTools.ttLib.woff2 import compress
compress("Sarabun-Regular.ttf", "Sarabun-Regular.woff2")   # same for Medium, SemiBold, Bold
```

`Light` (300) is **not** committed: no page or component uses `font-light`, so shipping it
would preload a file nobody uses.

## How the committed files were verified

Each WOFF2 was re-opened with fontTools and checked against its upstream TTF:

- magic bytes `wOF2`, and the file decompresses without error;
- the same **777 glyphs** and **725 codepoints**, including the Thai block (ก ฮ ่ ำ ๐ ๛) and
  Latin (A a é) — so nothing was subsetted away and Thai still renders fully;
- `OS/2.usWeightClass` is **400 / 500 / 600 / 700** as the file name says, so the browser gets
  the real weight instead of a synthesised one;
- the licence travels with the binary: name IDs 0 (*"Copyright 2018 The Sarabun Project
  Authors"*), 13 (*"licensed under the SIL Open Font License…"*) and 14 (the OFL URL) are
  present in every converted file;
- `sha256` of both the committed file and the upstream original are in the table above, so
  anyone can re-derive or re-verify them.

## Licence obligations that stay with the font

SIL OFL 1.1 keeps the copyright and licence with the font, so `OFL.txt` sits in this directory
and `NOTICE` lists the font as third-party material under OFL — **not** under the project's
Apache-2.0. Converting TTF to WOFF2 is a format change (an OFL "Modified Version"); that is
permitted here because the copyright line declares **no Reserved Font Name**, so no rename is
required, and the font is not sold on its own.

`next/font/local` embeds these files at build time; the browser receives them from
`_next/static/media/`, not from `public/`, and never from Google.

## Updating

Fetch the new upstream TTF, run the conversion above, replace the file, recompute the table
(`sha256sum *.woff2`), re-check glyph/codepoint count and `usWeightClass`, and keep `OFL.txt`
in step with the source repository.
