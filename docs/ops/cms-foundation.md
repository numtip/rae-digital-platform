# CMS foundation

Status: code and tests only. No database and no admin runtime are provisioned.

The public site stays a static export. `/th/cms-admin/` and `/en/cms-admin/` are an empty desk with `noindex`. They do not list drafts and are not linked from the homepage or the sitemap.

Workflow, RBAC, SharePoint link checks, media magic-byte checks, audit append, and session hashing live in `lib/cms/`. The database schema is `cms-runtime/migrations/*.sql`, read through `lib/cms/mysql-repository.ts`; an earlier unconnected Prisma schema was removed because it did not match the tables the CMS uses.

Blocked until a separate infrastructure approval: creating a database, starting a Node CMS process, and deploying it beside the static staging container.
