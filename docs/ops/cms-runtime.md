# CMS runtime (not deployed)

The API in `cms-runtime/server.mjs` is an isolated process. It is not part of the static export and is not started on the VPS.

Authentication stores only a session hash. `/v1/export` returns published items with https sources. Drafts are omitted. Publishing without `news:publish` returns 403.

`cms-runtime/migrations/001_init.sql` is for a future disposable MariaDB. `rollback.sql` drops those four tables. Do not apply either file to the attendance database.

Infrastructure still required before any VPS database: a separate approval, a new empty database, and a Node process that is not the public static container.
