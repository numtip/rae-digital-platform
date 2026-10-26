# Next session — 2026-10-26

`main` is `04256ed`. Do not start a new feature until the open PRs below are reviewed.

## Done

- Public TH/EN site is on GitHub Pages and on VPS static staging (`127.0.0.1:8090`, HTTPS path `/rae-digital-staging/` with Basic Auth and `noindex`).
- Landing modules and the systems directory are on `main`.
- CMS code exists only on stacked branches: workflow rules, noindex desk kept out of the static export, local API, and a news desk (list, draft, edit, preview, submit, approve, publish).

## Merge order

| Order | PR | Branch | Head | Base | CI |
|---|---|---|---|---|---|
| 1 | [#51](https://github.com/numtip/rae-digital-platform/pull/51) | `feat/cms-foundation` | `5f243cd` | `main` | build pass, review required |
| 2 | [#52](https://github.com/numtip/rae-digital-platform/pull/52) | `feat/cms-runtime` | `95f0ec6` | #51 branch | build pass |
| 3 | [#54](https://github.com/numtip/rae-digital-platform/pull/54) | `feat/cms-news-ui` | `f27ae75` | #52 branch | build pass |
| any time | [#53](https://github.com/numtip/rae-digital-platform/pull/53) | `feat/nav-systems` | `2189bd2` | `main` | build pass, review required |

Local QA on those branches: `npm test` and `tsc --noEmit` passed. News workflow was also checked in the browser against a temporary local API. No VPS database was created.

## Do not do yet

- Do not deploy CMS onto the VPS. Static staging must keep serving only published pages.
- Do not create a CMS database, change host Nginx, DNS, Cloudflare, or production services.
- A-39/A-06 backup gap stays open.
- Agent Core is not enrolled for `rae-digital-platform`. Hermes owns that. Do not create tokens or edit MCP config.

## Next

1. Human review, then merge #51, retarget #52 onto `main` if GitHub does not do it, then #52, then #54. #53 can merge independently.
2. Next blueprint slice after that is a real knowledge page only if sourced copy already exists. Do not invent content.
3. CMS on the VPS waits for a separate empty database and a process that is not the static container on port 8090.
