# CMS runtime (not deployed)

The API in `cms-runtime/server.mjs` is an isolated process. It is not part of the static export and is not started on the VPS.

Authentication stores only a session hash. A session ends after 30 idle minutes or 8 hours
in total, whichever comes first. Five failed logins lock that account for 15 minutes (sliding
window, `lib/cms/login-throttle.ts`). `/v1/export` returns published items with https sources. Drafts are omitted. Publishing without `news:publish` returns 403.

Workflow: an officer drafts and submits their own item; a reviewer may approve it or send it
back with a reason, which returns it to draft so the author can edit and resubmit. Nobody can
approve or publish their own item.

`cms-runtime/migrations/001_init.sql` is for a future disposable MariaDB. `rollback.sql` drops those four tables. Do not apply either file to the attendance database.

Infrastructure still required before any VPS database: a separate approval, a new empty database, and a Node process that is not the public static container.
