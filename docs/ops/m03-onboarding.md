# M03 Document Center — onboarding real documents

Files stay in Microsoft 365 (ADR-0004). The registry holds a title, a category, a version and a validated SharePoint file link.

## Bulk import (existing links)
1. Fill `docs/ops/m03-import-template.csv`: `category` (`administration` | `research` | `academic-services`), `titleTh`, `titleEn`,
   `storageUrl` (a **file** link on `maejo365-my.sharepoint.com`, not a folder), optional `version`, `note`. Quote cells that contain commas.
2. Dry run (writes nothing): `node scripts/import-m365-links.mjs your.csv` — set `RAE_IMPORT_USER` / `RAE_IMPORT_PASSWORD` (an officer or
   above) so it also checks the registry; it lists new / duplicate / invalid rows. Duplicates are the same file even when the link differs in
   case, query string or encoding.
3. Apply: add `--apply`. Every new row becomes a **draft**; nothing is public.
4. Review in the CMS desk (Document register). A publisher sets each record to *Current (published)*; it then appears on `/documents/`,
   its category page, its own detail page, the sitemap and search. Retire with *Obsolete* / *Archived*.

## Ongoing
- New file for an existing record: *New file version* in the desk (a new version number is required; history is kept).
- Link health runs daily and on demand (*Check all links now*); broken links show in the desk list, never to the public.
- Open counts are per record and lag the page by up to a minute (cached render).
