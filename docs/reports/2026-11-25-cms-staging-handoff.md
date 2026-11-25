# Handoff — RAE CMS staging ready for human UAT

**Date:** 2026-11-25  
**Mission:** `RAE_CMS_STAGING_READY`  
**Repo:** `numtip/rae-digital-platform`  
**Checkout:** `/home/rae_admin/rae/rae-digital-platform`  
**Main SHA:** `a12d6266aa83a13b82f283204dccd8ad48ef7d9a` (`docs(reports): 2026-11-25 audit closeout (#103)`)  
**Read first:** this file, then `docs/reports/2026-11-25-audit-closeout.md`. Do not repeat the full repository audit.

The CMS and the Next.js server are running for human UAT on loopback. The public static site was not replaced. Nothing was committed after `a12d626`.

## สรุปสั้น (ภาษาไทย)

งานเฟสนี้ทำให้แผงข่าว CMS ใช้ได้บน staging ภายในเครื่องแล้ว เส้นทางคือ ฉบับร่าง → ส่งตรวจ → อนุมัติ → เผยแพร่ → เปิดแก้ไขขณะยังเผยแพร่ → เผยแพร่อีกครั้ง → ถอน ตรวจหน้าเว็บ ค้นหา sitemap สิทธิ์รูป และคอนทราสต์ของ hero แล้ว รหัสผ่าน UAT อยู่ในไฟล์นอก git ห้าม commit และห้ามวางในรายงาน เว็บสาธารณะที่ `/rae-digital-staging/` ยังเป็น static เดิม ไม่ได้ต่อเข้า CMS

## Where a person works

| What | URL | Bound to |
|---|---|---|
| News desk (UAT) | `http://127.0.0.1:3417/th/cms-admin/` and `/en/cms-admin/` | `127.0.0.1:3417` only |
| Live site from that runtime | `http://127.0.0.1:3417/th/` and `/en/` | same |
| Public static staging (unchanged) | `https://raeservice.mju.ac.th/rae-digital-staging/` | container `rae-digital-staging-web` on `127.0.0.1:8090` |
| CMS API | `http://127.0.0.1:3317` | `127.0.0.1:3317` only. Export without a token is `401` |

From another computer: `ssh -L 3417:127.0.0.1:3417 <this host>`. Do not publish 3317 or 3417 on a public interface. Do not point host nginx at 3417 without a new approval. Port 3000 is the attendance API; the revalidate hook must not use it.

UAT accounts (mode `0600`, not in git):

`/home/rae_admin/rae/rae-cms-secrets/uat-accounts.txt`

| User | Role |
|---|---|
| `uat-officer` | drafts and submits own items |
| `uat-editor` | reviews and approves (not their own) |
| `uat-publisher` | publishes and unpublishes |
| `uat-viewer` | site reader used by Next (`RAE_CMS_USER`). No draft access |

`prinya` (admin) and `svc-sync` (officer) were already in `rae_cms`. Their passwords were not changed.

## What is running

Both units are user systemd units and were `active` at the handoff:

- `rae-cms-runtime.service` — Docker `rae-cms-runtime` (`node:22-bookworm-slim`) on network `rae-cms-net`, port `127.0.0.1:3317:3317`. Code mount: `/home/rae_admin/rae/rae-cms-runtime/app` at detached `a12d626`. Media: `/home/rae_admin/rae/rae-cms-media` → `/media`. Env: `/home/rae_admin/rae/rae-cms-secrets/runtime.env`.
- `rae-digital-next-staging.service` — Docker `rae-digital-next` on `rae-cms-net`, port `127.0.0.1:3417:3417`. It mounts this checkout (`/home/rae_admin/rae/rae-digital-platform`) and `/home/rae_admin/rae/rae-cms-data` as `/data`. Unit file: `~/.config/systemd/user/rae-digital-next-staging.service`. Env: `/home/rae_admin/rae/rae-cms-secrets/site.env`.

Inside the Next container, `RAE_CMS_API` and `NEXT_CMS_API_PROXY` are `http://rae-cms-runtime:3317`. The browser talks to `/cms-api/*` on the Next origin (rewritten to the CMS). That rewrite is baked in `.next/routes-manifest.json` from the build that set `NEXT_CMS_API_PROXY`. Rebuilding on the host without that value points the proxy back at `127.0.0.1:3317`, which is wrong inside the container.

The CMS hook target is `http://rae-digital-next:3417/api/news-live/revalidate` (`RAE_SITE_REVALIDATE_URL` in `runtime.env`). `RAE_REVALIDATE_SECRET` is set in both env files and is the same value. A container cannot reach the host's `127.0.0.1:3417`; that was tried and timed out. Keep the hook on the Docker DNS name.

`rae-cms-db` is MariaDB 10.6 on `rae-cms-net` with no published port. Database name `rae_cms`. Never point these migrations at the attendance database.

## Database and backup

Migration `cms-runtime/migrations/007_editorial_lifecycle.sql` was applied to live `rae_cms` on 2026-11-25. New columns on `news_articles`: `withdrawn_at`, `withdrawn_by`, `withdrawal_reason`, `revision_no`, `published_snapshot`.

`cms-runtime/rollback.sql` drops `news_media`, `news_articles`, `audit_logs`, `sessions`, and `users`. It was run only on disposable database `rae_cms_rollback_test`, which was then dropped. Do not run it on `rae_cms`.

Pre-deploy backup (mode `0600` files):

`/home/rae_admin/rae/rae-cms-backups/pre-deploy-20261125T054232Z/`

- `rae_cms.sql.gz`
- `rae-cms-media.tar.gz`
- `SHA256SUMS`

Nightly dumps continue under `/home/rae_admin/rae/rae-cms-backups/daily/`. Media bytes in the backup matched the five JPEGs under `rae-cms-media/quality-assurance-public-hearing-2026/`.

Verified on the real database (`node --test tests/cms-repository.test.mjs` with `RAE_CMS_DB_*`, run from a `node:22` container on `rae-cms-net`):

- reads and writes
- a failed audit insert rolls the article change back (`actor_id` is `VARCHAR(64)`; an 80-character id fails the audit insert)
- rows survive a new pool
- draft → return → edit → approve → publish survives an HTTP restart against the same database

## Publish hook

`app/api/news-live/revalidate/route.ts` plus `notifySite` in `cms-runtime/server.mjs`.

Verified against the running Next server:

- no secret, or a wrong secret: `401`
- valid secret and `{}`: `200` `{"revalidated":true,"withdrawn":0}`
- malformed body: `400`
- eight concurrent `POST`s with distinct ids all persisted in `/home/rae_admin/rae/rae-cms-data/withdrawn.json` (mounted at `/data/withdrawn.json` in Next)
- Next stopped: `notifySite` returned false and logged that the site was not told. The CMS write still returns 200
- Next started again: `notifySite` returned true
- a later check of `docker logs rae-cms-runtime` showed no `NOT told` lines in the ten minutes after the successful editorial run

Test tombstone ids `uat-withdraw-0` … `uat-withdraw-7` may still be in `withdrawn.json`. They are not real articles.

## Editorial result

Browser run (Chromium on this host) against the desk, then HTTP checks of the public pages:

| Step | Result |
|---|---|
| Officer saves a draft and submits | Pass |
| Viewer `GET /v1/news/<id>/media` on a draft | 404 |
| Officer same request | 200 |
| Public `/api/news-live/media/...` before publish | 404 |
| Editor approves (different person) | Pass |
| Publisher publishes | Pass. Title appeared on `/th/news/` |
| Search | Pass in the IDE browser. Query `ข่าวทดสอบ` listed the live test stories |
| Sitemap | The published id was present, then absent after unpublish |
| Revise while still published, edit, submit, approve, publish | Pass. The new Thai body was on the public article |
| Unpublish with a reason | Pass. List hid it, detail was 404, sitemap dropped the id, public media was 404 |
| Publish again after withdraw | Refused: `only an approved item can be published` |

Policy already in `lib/cms/news-workflow.ts` and the tests: a withdrawn row stays withdrawn. Republish means `POST /v1/news/<id>/revise` while the row is still `published`, then submit, approve, and publish. `revision_no` increments only on publish.

Hero contrast was measured from composited pixels behind the glyphs (screenshot with text, screenshot with the text forced transparent, worst background pixel). Viewports 390, 768, 1024, 1280, 1440, Thai and English. Large text (headline and gold accent) stayed at or above 3:1. The lowest gold sample was **3.77:1** (Thai, 1024). The lead stayed above 4.5:1 (lowest about 8.22:1). `prefers-reduced-motion: reduce` set `animation-name: none` and `opacity: 1` on `h1`, `.hero-fade-2`, and `.hero-fade-3`. The CI contrast script still cannot see an alpha scrim; a pixel sample is required for any scrim change. See `docs/memory/NEXT_SESSION.md` (that file's SHA is stale; the measurement method is not).

Leftover rows in `rae_cms` from this run use ids `news-179558*`. Published test stories were withdrawn (`ล้างข่าวทดสอบสเตจจิง` or `ทดสอบการถอนบนสเตจจิง`). Drafts and one `review` row remain and are not public. Titles start with `ข่าวทดสอบสเตจจิง` or `Staging CMS readiness`. The real article `quality-assurance-public-hearing-2026` was not modified. Search for `ข่าวทดสอบ` on the live runtime did not list those stories after the withdrawals.

## Local code, not on `main`

`git status` on the platform checkout:

```
## main...origin/main
 M components/cms/news-desk.tsx
 M lib/cms/admin-copy.ts
 M tests/cms-repository.test.mjs
?? AGENTS.md
?? docs/VPS_STAGING_AUDIT_SUMMARY.md
?? docs/VPS_STAGING_REPORT.md
```

The three modifications are the UAT fixes. Next is serving this working tree, so the desk already has the new buttons. The CMS container does not need those files.

1. `components/cms/news-desk.tsx` — for a `published` row, buttons call `POST /v1/news/<id>/revise` and `POST /v1/news/<id>/unpublish`. Unpublish requires the reason field.
2. `lib/cms/admin-copy.ts` — Thai and English labels: `revise`, `unpublish`, `unpublishReason`. The reason label is now the shorter "เหตุผล" / "Reason".
3. `tests/cms-repository.test.mjs` — `a failed audit rolls the article change back`, skipped unless `RAE_CMS_DB_HOST` is set.

`tests/cms-desk-auth.test.mjs`: 8 pass after the desk edit.

Do not commit `AGENTS.md` unless it is named in `NOTICE` or added to the `META` list in `tests/content.test.mjs`. It is the Next.js agent-rules file and it is the only failure in a default `npm test` (139 pass, 1 fail, 4 skip). The three MySQL tests skip without `RAE_CMS_DB_HOST`. One image-resize test skips when the image CLI is absent. `docs/VPS_STAGING_AUDIT_SUMMARY.md` and `docs/VPS_STAGING_REPORT.md` were already untracked before this mission; they were not part of the work.

`npm run typecheck` and `npm run build` passed on Node `v22.23.2` (`/home/rae_admin/.nvm/versions/node/v22.23.2`). Host `/usr/bin/node` is v12 and cannot build this app. The production build emits 162 pages. `next build` warns that `lib/cms/published-site.ts` traces the whole project via `process.cwd()`. It did not fail the build. Peer-dependency warnings from ESLint 10 are the ones the closeout left in place.

Node 22 is required because `cms-runtime/server.mjs` imports `.ts` files and relies on type stripping.

## Gates that still say no

`docs/ops/vps-staging/06_GO_NO_GO.md` (2026-10-26) blocked a VPS install. `docs/ops/cms-foundation.md` still says the database and the Node process are blocked on infrastructure approval. Those sentences are older than the running containers. This mission deployed the existing loopback CMS and a new loopback Next container. It did not change host nginx, DNS, firewall, attendance, or any other container.

`docs/architecture/DATABASE_AND_API_BLUEPRINT.md` still names Prisma as the planned ORM. Prisma was removed from the tree in #102. This phase keeps `lib/cms/mysql-repository.ts`. Do not add Prisma.

## Do not

- Commit secrets, `.env`, `runtime.env`, `site.env`, or `uat-accounts.txt`.
- Run `cms-runtime/rollback.sql` against `rae_cms`.
- Apply CMS SQL to the attendance database or to `mariadb` on `127.0.0.1:3306`.
- Bind the CMS or Next on `0.0.0.0` of the host. Inside the Next container, `HOSTNAME=0.0.0.0` is required only so Docker's `127.0.0.1:3417` publish reaches the process.
- Point `RAE_SITE_REVALIDATE_URL` at `127.0.0.1:3000` or at the host's `127.0.0.1:3417` from inside `rae-cms-runtime`.
- Restart unrelated containers. `attendance-api` owns host port 3000.
- Replace `rae-digital-staging-web` (8090) or change `/etc/nginx` unless the owner approves a public cutover.
- Treat a withdrawn article as republishable. The tests forbid `revisePublished` on `withdrawn`.

## Next agent, in order

1. Read this file and `docs/reports/2026-11-25-audit-closeout.md`. Confirm `systemctl --user is-active` for both units and `curl` the three URLs above (`200`, `200`, static health `200`).
2. If the owner wants the desk change on `main`, commit only the three modified files. The message should say why the desk can open a revision and withdraw. Do not include `AGENTS.md` or the two untracked VPS docs unless asked. Push and open a PR only if asked.
3. Human UAT on `http://127.0.0.1:3417/th/cms-admin/` with the four accounts. Ask the tester to confirm the image upload button. Automation showed the chosen filename and then the API accepted the bytes, but the desk button itself did not POST during the robot run (`desk=false` in the E2E log). Gallery loading after a stored image did work.
4. Decide the public cutover separately. The static site at `/rae-digital-staging/` will not show CMS publishes until nginx is approved or someone runs the existing static export path (`scripts/staging/deploy.sh`). Manual promotion through `scripts/cms-sync.mjs` is still the path onto the committed `public/cms-published/` snapshot.
5. Optional cleanup: draft and `review` rows `news-179558*` can be left or removed with SQL limited to those ids. There is no delete API on purpose.
6. Optional product decision, not a bug: whether a withdrawn story may return to draft. Today it cannot. Say so in UAT instructions.

## Rebuild and restart

Host Node:

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
cd /home/rae_admin/rae/rae-digital-platform
set -a; . "$HOME/rae/rae-cms-secrets/site.env"; set +a
npm run build
systemctl --user restart rae-digital-next-staging.service
```

`site.env` must still set `NEXT_CMS_API_PROXY=http://rae-cms-runtime:3317` before `npm run build`, because the rewrite is compiled into `.next`.

CMS code refresh, only after `main` has the commit you mean to run:

```bash
git -C "$HOME/rae/rae-cms-runtime/app" fetch origin main
git -C "$HOME/rae/rae-cms-runtime/app" checkout --detach origin/main
mkdir -p "$HOME/rae/rae-cms-runtime/app/node_modules"
systemctl --user restart rae-cms-runtime.service
```

`prepare-app.sh` uses `$HOME/rae-cms-runtime`, which is not the live directory. The live tree is `$HOME/rae/rae-cms-runtime`. Do not run that script as written.

MySQL tests from the host cannot resolve `rae-cms-db`. Run them on the Docker network with `--env-file` pointing at `runtime.env`, and override `RAE_SITE_REVALIDATE_URL` to a closed port so a publish inside the test does not depend on Next.
