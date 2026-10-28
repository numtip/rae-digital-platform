# Landing link audit — 2026-10-26

Source page (read-only): `https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH`

## Published (HTTPS, response observed)

See `content/links.ts`. Featured systems: 7. Units: 5. Media: 3. Director form: 1. Other: 2.

`https://erp.mju.ac.th/researchIndex.aspx` — HEAD from this host timed out; the URL is already the research-database link on the current homepage and remains published with that provenance.

`https://researchex.mju.ac.th/organicmju` — responded 301.

**Correction 2026-10-29:** that address now answers `301 → /organicmju/` and the target answers **404**
on three probes; its last archived render is July 2025 and the office index still links it, so no
working replacement exists to publish. The tile was withdrawn from `content/links.ts` and from both
label maps — **units are now 4**, not 5. Restore it when the office publishes a live address.

## Withheld (not published as live links)

| Item | Reason |
|---|---|
| E-book gallery on `http://online.anyflip.com/...` | plain HTTP; six items |
| Youth volunteer card | markup sits in an HTML comment on the source page |
| Netlify apps (debt tracker, vehicle log) | not re-checked to HTTP 200 in this pass |
| Google Apps Script IDP dashboard | not re-checked |
| `maejo.link` activity form | short link, not re-checked |
| Personal GitHub Pages handbook | not an institutional host verified this pass |
| Google Calendar embeds | not re-checked |
| Logos on the legacy page | not copied; no separate licence to republish the image files |
