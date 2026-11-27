# Releases — build isolated, probe, switch, roll back

`scripts/ops/release.sh` (reference units in `deploy/production/systemd/`). Replaces building inside the serving tree.

| Step | Command | Effect on production |
|---|---|---|
| Build | `release.sh build <ref>` | none — exports the ref to `~/rae/releases/<sha12>/`, installs deps once per lockfile (`shared/deps-<hash>`), builds `.next` and `.next-landing` there |
| Check | `release.sh check <sha>` | none — starts the release on spare ports 3427/3428 and probes 11 + 11 routes (home, news, events + `.ics`, documents, knowledge, contact, about, search, desk, sitemap) |
| Runtime | `release.sh runtime <sha>` | restarts the CMS runtime (≈6 s API gap; the sites keep serving cached pages); records the previous sha, restores it if it does not come up |
| Switch | `release.sh switch <sha>` | runs *check*, then repoints `~/rae/current`, restarts both site units, probes the real ports, **rolls back automatically** if any probe fails. Gap = container restart, printed |
| Rollback | `release.sh rollback [sha]` | repoints to the previous (or named) release and restarts: seconds, no rebuild |
| Prune | `release.sh prune` | keeps the 3 newest plus serving and previous |

Order for a change with a migration: backup → apply the additive migration → `runtime <sha>` → `build` → `switch`. Migrations are additive, so the previous release keeps working after a rollback.
The units mount `~/rae/current` as `/app`; `rae-cms-data` (withdrawn tombstones) is separate and shared by every release. Export builds (`npm run build:export`) now belong in the dev tree, which no longer serves anything.
Do not run `pkill -f "next build"` from a shell whose command line contains that text.
