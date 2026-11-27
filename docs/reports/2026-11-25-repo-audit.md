# Repo audit — 2026-11-25

Local folder `G:\ProjectAI\rae-digital-platform` and GitHub `https://github.com/numtip/rae-digital-platform`. Read-only. No code was changed.

## What this repo does

This is the public website and the internal news desk for the Office of Agricultural Research and Extension (RAE), Maejo University. Readers get Thai and English pages (home, about, research, services, knowledge, news, documents, directory, search). A few staff draft, review and publish news in a small CMS. That CMS is meant to listen only on this machine (loopback). The public pages read it when it answers, and otherwise show the last copy committed under `public/cms-published/`.

Load assumed: a faculty site. Tens of people reading at once, a few staff editing. Not a large public service. The copy on GitHub Pages is a static export. The live CMS read runs only when someone starts the Node server.

## Local folder and GitHub

| | Local checkout | GitHub |
|---|---|---|
| Branch | `docs/day-closeout-2026-11-02` | default branch `main` |
| Commit | `453b258` | `4cbf233` |
| Working tree | clean | public repo, last push 2026-11-06 |
| Open issues | — | none |

The local commit is open PR **#98** (two documentation files only). Application code on this machine and on `main` is the same. Every code finding below is on GitHub `main`.

Also open on GitHub, and not in this checkout:

- **#97** hero scrim. CI was green on 2026-11-02. Not merged. Finding 5 is the bug it fixes.
- **#99** dependency bumps from Dependabot. Not reviewed line by line.

## Must fix

1. **The site calls the CMS on the wrong port** (`lib/cms/live.ts:L44`, `cms-runtime/server.mjs:L570`)
   - **What this is:** After a story is published, the Node site reads `GET /v1/export` from the CMS on loopback and renders that.
   - **Problem:** The CMS listens on port **3317** when `RAE_CMS_API_PORT` is unset. The desk, the sync script and `cms-runtime/.env.example` all use 3317. The site's reader uses **3321** when `RAE_CMS_API` is unset. Nothing in the repo sets that variable. The connection is refused, the reader treats the CMS as down, and the page keeps the old committed copy.
   - **Fix:** Use the same default in `cmsBase()`: `http://127.0.0.1:3317`. One constant, shared with the server.
   - **If we skip it:** Turning the CMS on does not change the website. Staff publish a story and readers never see it until someone runs `cms-sync` and rebuilds.

2. **Taking a story down does not stick when the CMS is unreachable** (`app/api/news-live/revalidate/route.ts:L16-41`, `cms-runtime/server.mjs:L456-469`)
   - **What this is:** Unpublish removes a story from the CMS export. A tombstone file is supposed to keep that id out of the committed fallback, and a hook is supposed to drop the 30-second page cache at once.
   - **Problem:** Nothing in the CMS calls that hook. `rememberWithdrawn` runs only when something POSTs to `/api/news-live/revalidate` with the id. Publish and unpublish never do that. The cache is not purged. The tombstone file stays empty. The next time the CMS does not answer, the site serves `public/cms-published/`, and the withdrawn story is public again.
   - **Fix:** After a successful unpublish, POST `{withdrawn:[id]}` to the site hook with `RAE_REVALIDATE_SECRET`. After a successful publish, POST an empty body so the cache drops. If the secret is unset, fail the request in the log and do not pretend the site was updated.
   - **If we skip it:** A story the office removed comes back for the whole outage. A new story can sit unseen for up to 30 seconds even while the CMS is up, because nothing drops the cache.

3. **A viewer can read unpublished photos** (`cms-runtime/server.mjs:L290-299` and `L525-528`)
   - **What this is:** The viewer role is the read-only account. `GET /v1/news` hides drafts. The tests say a viewer sees only published rows.
   - **Problem:** `GET /v1/news/<id>/media` returns captions and file names for any article, including a draft, to any logged-in user. `GET /v1/media/<id>/<file>` then returns the bytes to that same user. A viewer who knows or guesses the id (the officer chooses it, for example `budget-2026`) downloads the photo before it is approved. The viewer test never calls these two routes, so the suite stays green.
   - **Fix:** If the caller lacks `news:draft` and the article is not published or in revision, return 404 from both routes. Same answer as a missing file.
   - **If we skip it:** The account the public site uses, or any staff viewer, can pull images the office has not published.

4. **A news title can break out of the page script** (`app/[locale]/news/[nid]/page.tsx:L123-126` and `L264-266`, `components/page-shell.tsx:L76`)
   - **What this is:** The article title is placed in a JSON-LD block (`application/ld+json`) and in the breadcrumb JSON-LD. Both are inserted with `JSON.stringify` inside a `<script>` tag.
   - **Problem:** `JSON.stringify` does not escape `<`. A title that contains the characters `</script>` closes the script element. The HTML parser then runs whatever follows as a script in every reader's browser. The CMS preview escapes HTML, so a reviewer sees the words and not a script. The visible heading is also escaped by React. Only the JSON-LD block is raw. Example title: `ประกาศ</script><script>alert(1)</script>`.
   - **Fix:** One helper used by both script tags: `JSON.stringify(value).replace(/</g, "\\u003c")`. No new library.
   - **If we skip it:** A title that passes review runs script on the public article page.

## Should fix

5. **The homepage gold line fails contrast** (`app/[locale]/page.tsx:L79-85`)
   - **What this is:** The hero photo is covered by a flat green wash, `bg-brand-700/75`, and the accent line is gold (`text-gold-500`).
   - **Problem:** Measured on 2026-11-02 against this same markup: the gold is **2.45:1**. Large text needs **3:1** (WCAG 2.2 AA). The contrast script reads solid backgrounds, so an alpha wash is invisible to CI and the check stays green. PR **#97** replaces the flat wash with a gradient that measured at least 3.21:1. It is still unmerged, so `main` and this checkout still ship the flat wash.
   - **Fix:** Merge #97. Do not flatten that gradient back to one alpha without measuring the composited pixels again.
   - **If we skip it:** The first screen of the public site fails the contrast bar the project set for itself.

6. **Photos 6 to 10 are stored and then hidden** (`cms-runtime/server.mjs:L500-501`, `lib/cms/published-site.ts:L113`)
   - **What this is:** The desk accepts up to 10 images per article. The CMS preview prints every figure.
   - **Problem:** The public article view keeps only the first 5 (`slice(0, 5)`). An editor can upload a sixth image, see it in the preview, and the public page drops it with no error.
   - **Fix:** Reject the sixth upload (change the cap to 5) if five is the page design. Or remove the slice if ten is the design. One of those numbers has to go.
   - **If we skip it:** Staff think a photo was published. Readers never see it.

7. **The content gate fails on Windows for the wrong reason** (`tests/content.test.mjs:L30-32`)
   - **What this is:** `npm test` checks that every Thai content file has an English twin, that URLs are https, and that admin paths did not leak into the public copy.
   - **Problem:** The locale check looks for the characters `/th/` and `/content/`. This checkout is on Windows, so the paths use `\`. The Thai list is empty and the test reports "no Thai content files found". The closeout on 2026-11-02 already saw this: 133 pass, 1 fail, on a clean `main`. CI is Linux, so GitHub stays green.
   - **Fix:** Compare path segments with `path.sep` (or a pattern that accepts `\` and `/`). Do not special-case Windows in the assertion message.
   - **If we skip it:** A red suite on the machine this repo is edited on. A real locale drift is easy to miss behind a failure that is always there.

8. **A failed audit line makes a successful publish look failed** (`cms-runtime/server.mjs:L418-435`, `lib/cms/mysql-repository.ts:L194-234` and `L284-296`)
   - **What this is:** Publish writes the article, then writes an audit row. Both are separate statements.
   - **Problem:** If the article write succeeds and the audit insert throws, the handler answers 400. The row is already `published`. A retry is rejected, because only an `approved` row can be published. The desk shows an error for a story that is already in the export, and the audit trail has a hole.
   - **Fix:** Run the article write and the audit insert on one database transaction. If the audit insert fails, the article write rolls back and the client can retry.
   - **If we skip it:** The next database error during publish leaves staff and the public site disagreeing about whether the story is live.

9. **The password rule is never applied** (`lib/cms/validation.ts:L17-19`, `lib/cms/mysql-repository.ts:L149-154`)
   - **What this is:** `assertLocalPassword` requires 12 characters. A unit test calls it directly.
   - **Problem:** `addUser` and `addUserToRepository` hash whatever string they are given. A password of one character is stored and login accepts it. There is no user-create route, so this happens when someone seeds a user through that function.
   - **Fix:** Call `assertLocalPassword` inside `hashPassword` (or inside `addUserToRepository`) before hashing. The existing test then covers the real write.
   - **If we skip it:** The first seeded desk account can be shorter than the rule the tests claim to enforce.

10. **The README describes a different repository** (`README.md:L9-11` and `L182-183`)
    - **What this is:** The top of the README is the handoff the next person is told to trust.
    - **Problem:** It says `main` is still docs-only and that there is no application code, dated 2026-10-24. The tree has a Next.js app, a CMS and CI. Lower down, the same file says there is no `LICENSE`, then says the code is Apache-2.0 and links to `LICENSE`, which is in the tree.
    - **Fix:** Replace those two status blocks with the current truth: `main` is the app, Phase 1 public site is in the tree, CMS runtime is present and not publicly deployed, license is Apache-2.0 for the application source as `NOTICE` already says.
    - **If we skip it:** The next session starts from a false picture of what may be changed.

## Nice to have

11. **Two database schemas, one of them unused** (`prisma/schema.prisma`, 63 lines)
    - **What this is:** Prisma describes users, sessions, audit and news. The file says it is not connected. `package.json` has no Prisma dependency. The runtime uses `cms-runtime/migrations/*.sql` and `lib/cms/mysql-repository.ts`.
    - **Problem:** The Prisma models have no password column and no article body. The SQL tables do. Someone provisioning from the Prisma file builds a database the CMS cannot use.
    - **Fix:** Delete `prisma/schema.prisma`. The SQL migrations are the schema.
    - **If we skip it:** The wrong file stays next to the real one.

12. **Two server processes can drop a tombstone** (`lib/cms/withdrawn.ts:L59-70`)
    - **What this is:** The tombstone file is how a second Node process learns that a story was withdrawn. The comment already expects more than one process.
    - **Problem:** The update is read, then write, then rename, with no lock. Two processes withdrawing different ids at the same time can each start from the same list. The rename that finishes last keeps only its own id. This matters only after finding 2 is fixed and the site runs more than one process. Inside one process the writes are synchronous, so they do not interleave.
    - **Fix:** Take an exclusive lock file around the read-and-rename (`open` with the `wx` flag), and retry when the lock is held.
    - **If we skip it:** On a two-process deploy, one of two simultaneous withdrawals is forgotten, and that story returns during the next outage.

Smaller notes left out: about four (login lockout lives only in memory and clears on restart; `scrypt` runs on the CMS thread; the media proxy reads the file again on every cache miss; `document:register` and `user:assign_role` have no route). None of these break the faculty-site load while the CMS stays on loopback.

## Verdict

Fix **1** and **2** first. Until the port matches and unpublish tells the site, the live news path does not do the job it was written for. Then **3** and **4** before any real account uses the desk. The homepage contrast fix is already written: merge **#97**.

Lean: **-63 lines, -0 dependencies** possible (delete the unused Prisma schema).

## Not checked

- Did not run the test suite, the production build, or a browser pass. The Windows failure in finding 7 is from the path check in the test and from the 2026-11-02 run, which saw it fail on a clean tree.
- Did not review PR #97 or PR #99 line by line. Confirmed only that `main` still has the flat hero wash.
- Did not open the live GitHub Pages site or the VPS.
- Did not read the research evidence dumps, the Stitch design reference, or every content paragraph. Did read the request path for news, search, CMS login, sessions, permissions, media, export, the revalidate hook, and the staging container (loopback port 8090, static nginx).
- Did not audit git history for secrets. No `.env` with real values is in the tree. The examples are names only.
