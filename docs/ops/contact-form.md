# M07 — Contact form (off until the owner configures it)

The `/contact` page always shows the verified office details and, once entries are published, the CMS FAQ. The **form** is hidden and the endpoint answers 404 until all of this is set in `~/rae/rae-cms-secrets/runtime.env` (nothing is invented by the platform):

| Variable | Meaning |
|---|---|
| `CONTACT_FORM_ENABLED=true` | master switch |
| `CONTACT_RETENTION_DAYS` | whole days 1–3650 after which messages are deleted (owner/legal decision) |
| `CONTACT_NOTICE_JSON` | path (inside the runtime container) of a JSON file `{"version","th","en"}` with the **approved** PDPA privacy notice text; a new `version` makes older open forms re-load |
| `CONTACT_ALLOWED_ORIGINS` | `https://raeservice.mju.ac.th` (the canonical site posts cross-origin to the admin host, because nginx does not proxy `/rae-landing/api/contact`) |

and in the landing unit/env: `NEXT_PUBLIC_CONTACT_API=https://rae-cms.raemanagemju.net/cms-api`. Then restart `rae-cms-runtime` and the landing unit.

What is stored: name, email, subject, message, language, notice version, consent time, status. **No IP address or user agent.** Rate limit 5 per 10 minutes per client (`cf-connecting-ip`), honeypot field, server-side validation. Editors and above read and triage messages in the CMS desk ("Contact form messages"); every status change is audited (no message text in the audit row). Messages are purged by retention whenever the inbox is touched (at most hourly).

**Not built — needs MJU:** e-mail delivery/confirmation (SMTP host, port, credentials, sender address) — until then the desk inbox is the delivery channel. Captcha is not used (honeypot + rate limit); revisit if abuse appears.
Cloudflare Access on the admin pages must leave `/cms-api/*` open — the form posts to `/cms-api/v1/public/contact`.
