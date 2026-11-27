# M15 Media library

Images the office keeps for reuse (figures, photos, banners). **Images only** — png, jpeg, webp, up to 8 MB, judged by their
bytes (signature), never by file name or the browser's type. Official documents stay in SharePoint (ADR-0004); a PDF is refused.

| | |
|---|---|
| Desk | "Media library" panel on `/th|en/cms-admin/` (officer and above upload; a publisher releases) |
| Lifecycle | `draft` → `published` → `archived`. Only `published` is public. Publishing needs a publisher **and** alt text in both languages |
| API (session) | `GET/POST /v1/media-library`, `GET/PATCH /v1/media-library/{code}`, `GET /v1/media-library/{code}/{file}` (private preview) |
| API (public) | `GET /v1/public/media` (metadata + URL), `GET /v1/public/media/{code}/{file}` (bytes with the stored type, `nosniff`, sandbox CSP, 5 min cache). In the OpenAPI contract |
| Codes | `RAE-MD-0001`… assigned by the repository |
| Storage | metadata in `media_assets` (migration `018_media_library.sql`); bytes at `$RAE_CMS_MEDIA_DIR/library/<code>/<16 hex>.<ext>` (staged in `library/.incoming/` and moved once the row has its code) |
| Duplicates | the same bytes (sha256) cannot be uploaded twice while the first is not archived (409 with its code) |
| Audit | `media.create`, `media.update` (and `media.file-missing` if the file move failed after the row was written; the row is archived) |

## Use in news
In the news desk, an author can add a **published** library image to their own draft (`POST /v1/news/{id}/media/from-library`
with `{ "code": "RAE-MD-0001" }`, or the "Add an image from the library" form). The runtime **copies** the bytes into the article's
own gallery (same limits as an upload: author only, draft only, 5 images, judged again by signature), taking the alt text and
caption from the library entry. The article therefore keeps serving, snapshotting and withdrawing exactly like an uploaded image,
and archiving the library entry later does not touch articles that already use it. Audit action: `news.media.library`.

## Access control
`media:upload` (officer, editor, publisher, admin) reads and writes the library; going live or editing a live asset needs
`news:publish`. A viewer sees nothing. Drafts and archived files are reachable only with a session.

## Backups
The nightly media archive (`rae_cms-media-*.tar.gz`, `scripts/ops/backup-rae-cms.sh`) tars the whole media volume, so `library/`
is included with no change; the rows are in the database dump. Restore both together: the dump brings the metadata, the media
archive brings the bytes. A row whose file is missing answers 404 on its URL; nothing else breaks.

## Deploy note
Apply migration 018 (additive, safe with the site running) **before** switching to a release that contains this module, after the
usual `pre-<name>-<ts>` dump: `docker exec -i rae-cms-db mysql … < cms-runtime/migrations/018_media_library.sql`.
The runtime must be moved to the same SHA (`release.sh runtime <sha>`) because the routes live in the runtime.
