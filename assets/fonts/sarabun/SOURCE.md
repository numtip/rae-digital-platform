# Sarabun — self-hosted so the build needs no network

The website's typeface is Sarabun, by the Sarabun Project Authors (Cadson Demak),
licensed under the **SIL Open Font License 1.1**. The build used to download these files
from `fonts.googleapis.com` through `next/font/google`, which made every build — and every
CI run — depend on Google being reachable. These are the same font files, committed.

## Where each file came from

All five weights plus the licence and metadata were fetched on 2026-10-27 from the
canonical Google Fonts repository, directory `ofl/sarabun`:

`https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/<file>`

| file | bytes | sha256 |
|---|---|---|
| `Sarabun-Light.ttf` (300) | 90,440 | `9efd75e5ebb6d7755cca3faa5906c77a4bbd39c9aac0ed23bf7f4ba33b02f688` |
| `Sarabun-Regular.ttf` (400) | 90,220 | `226d4f368fbc0457990ddef2692679badfd2c1a4e89e5ac4d43c10ba7743b2f1` |
| `Sarabun-Medium.ttf` (500) | 90,292 | `cc7c3016daab3321674fdf6e2ef59850dc0c07503de1cbdb8b90fe8080ada2b4` |
| `Sarabun-SemiBold.ttf` (600) | 90,200 | `c0bb057d86e4a12097d701ac0953597e315788d47a446f5b63a6604ab21dceba` |
| `Sarabun-Bold.ttf` (700) | 89,804 | `d38308ca27d067b9a1b79006337c1f9a66c29aa016d96a9d88d3801da7fa83b9` |
| `OFL.txt` | 4,387 | `b26cae1321380296ba8311b632a397d5eac11b47197f9d0aa0b9310f1531ad60` |

## How the files were verified

- every response was **HTTP 200** from the address above, and no file is empty;
- `file` reports *TrueType Font data* for all five — no truncated or HTML-error downloads;
- `fc-query` reads family **Sarabun** and the expected styles (Light 300, Regular 400,
  Medium 500, SemiBold 600, Bold 700) out of the font's own name table, so the binary is
  the font it claims to be;
- `OFL.txt` carries the copyright line *"Copyright 2018 The Sarabun Project Authors
  (https://github.com/cadsondemak/Sarabun)"* and the full SIL OFL 1.1 text;
- `METADATA.pb` from the same directory declares `license: "OFL"`.

## Licence obligations that stay with the font

SIL OFL 1.1 keeps the copyright and licence notice with the font, so `OFL.txt` sits in this
directory and `NOTICE` lists the font as third-party material under OFL — **not** under the
project's Apache-2.0 (Apache-2.0 does not cover the typeface, and OFL does not allow the
font to be sold on its own). `next/font/local` embeds the font at build time; the browser
receives the rendered woff2, not these files from `public/`.

## Updating

Replace the files, recompute the table above (`sha256sum *.ttf`), confirm `fc-query` still
reports the family and styles, and keep `OFL.txt` in step with the source repository.
