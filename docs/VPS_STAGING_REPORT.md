# VPS Staging Report — 2026-10-27

**Repository:** `numtip/rae-digital-platform`  
**Host:** `raeserver` (VPS-A), Ubuntu 22.04.5 LTS  
**Operator:** Cursor agent, on the host as `rae_admin`  
**Scope:** Isolated staging of verified `main`. No production cutover. Shared Nginx, DNS, and TLS were not changed.

## Final gates

| Gate | Result |
|---|---|
| `RAE_MAIN_DEPLOYED_TO_STAGING` | **PASS** |
| `VPS_STAGING_QA_PASS` | **PASS** |
| `PRODUCTION_UNCHANGED` | **PASS** |

The earlier preflight (`VPS_PREFLIGHT_PASS`) still stands. PR #72 was merged after that preflight, and this run deployed that commit.

---

## 1. Host, commit, and architecture

| Item | Value |
|---|---|
| Hostname | `raeserver` |
| Disk | 223 GB free of 490 GB (53% used) |
| Memory before build | 7.6 GiB total, about 3.9 GiB available, swap 2.0 / 4.0 GiB used |
| Host Node | v12.22.9 — not used |
| Build runtime | `node:22-bookworm-slim`, Node **v22.23.4**, container memory cap 2560 MiB, 1.5 CPU |
| Verified `main` | `87f92d934e5808498aa1ea69535e0fab7263caa8` |
| Commit | `fix(seo): share cards point at the page, not the locale home (#72)` |
| Parents | `6aa10fac5a4fab9c39d3fe11a94b2ecca88a8cf1` (#71) |
| CI | [run 40450829066](https://github.com/numtip/rae-digital-platform/actions/runs/40450829066) success |
| Pages preview | [run 40450829051](https://github.com/numtip/rae-digital-platform/actions/runs/40450829051) success |
| PRs #71–#74 | All **MERGED** |

Checkout used for the build, outside the existing workspace:

`/home/rae_admin/rae-main-staging/src`  
detached HEAD at `87f92d934e5808498aa1ea69535e0fab7263caa8`

The existing workspace `/home/rae_admin/rae-digital-platform` stayed on `feat/cms-news-ui` at `50a60287f123e2a80027032cc9cc4735d30d7601`. Nothing was built there.

### Two staging stacks

| | Existing static staging | New main staging |
|---|---|---|
| Compose project | `rae-digital-staging` | `rae-main-staging` |
| Container | `rae-digital-staging-web` | `rae-main-staging-web` |
| Image | `rae-digital-staging-static:04256ed2f110707eaa6d85fe616cc26f372d1766` | `rae-main-staging-static:87f92d934e5808498aa1ea69535e0fab7263caa8` |
| Image id | `sha256:1f455bf4bc5b651c2ada394e763f7cbc2d4feafa6090f909f6a1dfb2bebe89c3` | `sha256:505e7d3f70daa14cedb345e9dca3ccca5e246a87274424e6b1db6dafd271693b` |
| Network | `rae-digital-staging-net` | `rae-main-staging-net` |
| Bind | `127.0.0.1:8090` | `127.0.0.1:8091` |
| Public route | `https://raeservice.mju.ac.th/rae-digital-staging/` with Basic Auth | none |

The new container is read-only, drops all capabilities except those nginx needs to bind port 80, and is limited to 128 MiB and 0.5 CPU. It is not attached to `rae-cms-net` or `rae-digital-staging-net`.

The site is the static export (`NEXT_PAGES_PREVIEW=1`), same origin and base path as the verified Pages build:

- `NEXT_PUBLIC_SITE_URL=https://numtip.github.io/rae-digital-platform`
- base path `/rae-digital-platform`

`npm run build:export` compiled 159 static pages. `check-export` reported 157 HTML files, 156 routes, 9,106 internal refs, and 152 share cards, then printed OK. `public/cms-published` was absent before and after the build. No HTML file contains `/cms-published/`.

---

## 2. Port and SSH access

The new staging is not on the public proxy. From a workstation:

```bash
ssh -L 8091:127.0.0.1:8091 <user>@raeserver
```

Then open:

`http://127.0.0.1:8091/rae-digital-platform/th/`

English: `http://127.0.0.1:8091/rae-digital-platform/en/`

Health: `http://127.0.0.1:8091/healthz`  
returns `{"status":"ok","env":"rae-main-staging","commit":"87f92d934e5808498aa1ea69535e0fab7263caa8"}`

Listener evidence: `127.0.0.1:8091` only. Responses send `X-Robots-Tag: noindex, nofollow`. There is no Basic Auth on this port because it is not published. SSH plus the loopback bind is the access control. Do not add it to host Nginx in this phase.

The existing public URL still serves the old image and still returns **401** without credentials.

Canonical and Open Graph URLs point at `https://numtip.github.io/rae-digital-platform/...`, which is the verified preview origin. They do not point at `raeservice.mju.ac.th`.

---

## 3. Build and container health

| Check | Result |
|---|---|
| Node inside the build container | v22.23.4 |
| `npm ci --include=dev` | 377 packages, 0 vulnerabilities |
| `next build` with `NEXT_PAGES_PREVIEW=1` | success, Next.js 16.4.3 |
| `check-export` | OK |
| Preview-data guard | `public/cms-published` did not exist, so the production guard did not have to refuse the build |
| Image | built, `nginx:1.27-alpine`, `nginx -t` passed inside the image |
| Container health | **healthy** after start, after `docker restart`, and after the rollback drill |
| Logs | nginx 1.27.5 started workers. One notice: the read-only root stopped the entrypoint from editing `default.conf`. The copied config was already valid and the process became healthy. No error lines. |

---

## 4. QA

Checked from the host against `127.0.0.1:8091` on 2026-10-27. Browser checks used headless Chromium at 375×812 and were stopped afterward.

| Check | Result | Evidence |
|---|---|---|
| TH/EN home, about, research, services, documents, knowledge, news, events, news page 2, contact, search, directory | **PASS** | HTTP 200 on both locales |
| Language switch | **PASS** | `/th/about/` links to `/rae-digital-platform/en/about/` and the Thai path |
| News article `/news/38764/` | **PASS** | TH and EN 200; listed from the Thai news index |
| Documents | **PASS** | `/th/documents/` 200 with 15 `https://` links; category `administration` and `research` 200 in TH (research also checked in EN) |
| Search | **PASS** | `?q=สำนัก` filled the search box and rendered 57 results in `main`. `?q=zzzz-no-such-term` rendered 0. The legacy sara-am spelling (`ส` + U+0E4D + U+0E32 + `นัก`) returned the same main-link count as the modern spelling in the first comparison (58/58 on a broader selector). |
| Mobile 375px | **PASS** | Header, open menu, and page hero render in a 375px viewport. Screenshot: `/home/rae_admin/rae-main-staging/qa-375-th.png` |
| 44px targets | **PASS** | Search, English, and the menu button measured 44×44. Opened nav links measured 343×44. `check-export` also required `min-h-11` on header controls. Closed menu items report a 12px-wide box until the menu opens; once open they meet 44px. |
| Canonical, hreflang, OG, Twitter | **PASS** | On home, about, news article, search, documents, and directory: `og:url` equals the canonical URL, `og:title` and `twitter:title` match that page, and `hreflang` th/en/x-default point at the matching pair. About and the news article do not advertise the locale home. |
| Sitemap | **PASS** | 152 URLs. `cms-admin` is not listed. |
| Unknown path | **PASS** | `/th/does-not-exist/` returns 404 with `noindex` |
| Preview-data isolation | **PASS** | No `cms-published` directory in the export. No `/cms-published/` string in HTML. No `127.0.0.1:3317` in the export. |
| CMS desk | **PASS** with limitation | `/th/cms-admin/` and `/en/cms-admin/` are the static not-found shell (`__next_error__`), `noindex`, with no news desk. The preview build calls `notFound()` for that route, so Next still emits a file and the HTTP status is 200. The desk is not rendered. |
| Live CMS article on this staging site | **SKIP** | The one published row in `rae_cms` is not part of this export. `public/cms-published` is git-ignored and was not generated. Publication stays manual. The database was not read for content and was not modified. |
| HTTP health and logs | **PASS** | See section 3 |
| Authentication and isolation | **PASS** | New port is loopback-only and on `rae-main-staging-net` only. Public `/rae-digital-staging/` remains Basic Auth and still returns 401. |
| Restart | **PASS** | `docker restart rae-main-staging-web` returned to healthy and `/healthz` 200 |
| Rollback drill | **PASS** | `docker stop` closed 8091. Port 8090 stayed up with the old health payload. CMS containers kept their original start times. `docker start` restored 8091. |

---

## 5. Backup and rollback

There was no previous `rae-main-staging` release to archive. The public staging container was left running as the known-good public route.

CMS checksums, taken read-only before the build and again after QA, were identical:

| Table | Checksum |
|---|---|
| `audit_logs` | 79055758 |
| `news_articles` | 1499970458 |
| `news_media` | 2367581950 |
| `sessions` | 2325259967 |
| `users` | 3812221923 |

`news_articles.published_at` was already `datetime NULL`. Migration 005 was not applied.

To remove only the new staging:

```bash
cd /home/rae_admin/rae-main-staging
docker compose -p rae-main-staging down
```

That stops `rae-main-staging-web` and removes `rae-main-staging-net`. It does not use the Compose project in `/home/rae_admin/rae-digital-platform`, does not touch port 8090, and does not touch `rae-cms-runtime` or `rae-cms-db`. The stop half of this was executed and then reversed, so the new staging is up again.

To put the new container back without a rebuild:

```bash
docker start rae-main-staging-web
```

---

## 6. Existing staging, CMS, and production

Unchanged after this deploy:

| Item | Evidence |
|---|---|
| `rae-digital-staging-web` | Same id `b7948269ba26…`, still started 2026-10-26 07:14:43Z, health payload still `env=staging-static` |
| `rae-cms-runtime` | Same id `3fd6cfb80a30…`, still started 2026-10-27 02:18:54Z |
| `rae-cms-db` | Same id `bc0d2f04779b…`, still started 2026-10-26 15:01:59Z, no host port |
| CMS checksums | Match the pre-build snapshot |
| Host nginx snippet | SHA-256 `0d56b78e9b4bf9356e8c47b63c1d7280332e26b4626bd07ecd638c49e1be711a` |
| `raeservice.mju.ac.th` vhost | SHA-256 `ee2f2a6d0442760e32089ceed764649c81a2ac6195085504915c5d456e9a1839` |
| Public staging route | Unauthenticated request still **401** |
| Workspace branch | Still `feat/cms-news-ui`. This report is an untracked file. It was not committed. |

No DNS change, no TLS change, no firewall change, no migration, and no content import.

---

## 7. Remaining notes

- Reviewers who open `https://raeservice.mju.ac.th/rae-digital-staging/` are still on commit `04256ed`, not `87f92d9`. Use the SSH tunnel above for this release.
- Putting this release on that public prefix would be a shared Nginx change and is not authorized here.
- The live CMS article will appear in a static export only after someone deliberately writes `public/cms-published` and accepts that the build guard will then refuse a production build until that directory is removed. This deploy did not do that.
- Swap was already 2 GiB used. The build was capped at 2560 MiB and completed. Later builds should keep a container memory cap.
