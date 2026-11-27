# ADR-0004 — Documents stay in Microsoft 365; the site is a registry

- **Status:** Accepted (aligns with owner constraint C5/C6)
- **Date:** 2026-10-24
- **Context doc:** `../DATABASE_AND_API_BLUEPRINT.md §3.4`, `../LEGACY_REUSE_ASSESSMENT.md §3.4`

## Context

RAE already stores document masters in Microsoft 365 / SharePoint
(`maejo365-my.sharepoint.com`), and the existing Next.js repo documents the principle that the
website is a **Document Registry, not a DMS**. The platform also needs a correspondence registry
with letter numbers, a document library with versions, and download counting.

Two tempting shortcuts are rejected: copying files onto the web server, and building a Graph-based
upload/sync proxy.

## Decision

1. **Master files remain in SharePoint/OneDrive.** The platform stores metadata only, plus a
   `storage_url` pointing at the file.
2. **No Microsoft Graph runtime dependency in v1.** A link is not a dependency; opening a
   SharePoint URL in a new tab requires no token, no app registration and no consent.
3. **Validation, not trust:** `storage_url` host must be the MJU tenant domain, folder URLs are
   rejected, and uniqueness is enforced (one document record per stored file).
4. **Download counting** is a local counter per document (no IP stored, only a hash for abuse limits).
5. **Correspondence** stores `storage_url` + `external_ref`; it must not upload letter scans to
   the web server.

## Consequences

- The platform cannot render document previews itself; it links out. Acceptable trade-off.
- If a future requirement genuinely needs in-app viewing or ACL-aware downloads, that is a new ADR
  with an app registration, least-privilege scopes and owner approval — not an incremental change.
- Broken/stale links are a real operational risk: a scheduled link-check job is part of Phase 2.

## Revisit triggers

- A requirement to serve files that SharePoint cannot share externally.
- A mandated retention/legal-hold policy that M365 cannot satisfy.
