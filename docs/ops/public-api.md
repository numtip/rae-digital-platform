# M23 — public content API

`GET https://rae-cms.raemanagemju.net/cms-api/v1/public/openapi.json` returns an OpenAPI 3.0.3 description of the **read-only, unauthenticated** public endpoints: documents (list, one), FAQ, events, departments, live announcements, contact-form config. Only published/public records and public fields are returned (no authors, no storage links, no status).

`tests/openapi.test.mjs` is the contract: every public GET route in the runtime must be in the spec, every documented path must answer 200 with the documented required fields, and no row may carry a field the spec does not list or an internal one (`createdBy`, `storageUrl`, `status`, `visibility`, `linkStatus`).

Not in this contract (by design): the desk API (session bearer token, role-checked), the contact POST and analytics beacon (browser endpoints, off by default), and JWT — the platform uses server-side session tokens (ADR-0006), not JWT. Public-site clients should use `/cms-api` on the admin host; `/rae-landing/cms-api` is intentionally not proxied. Keep Cloudflare Access off `/cms-api/*`.
