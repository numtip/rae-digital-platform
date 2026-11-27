# M12 Personnel — operations

**Owner decision (2026-11-27):** M12 is approved; the owner holds personnel-data governance. Gate A-4 / U-5 is no longer a development blocker and no third-party approval is required. Only **verified** data is entered: the platform seeds nothing and there is no HR sync (that is an external system).

## What is stored where
- `personnel` — directory fields (names TH/EN, position, rank, level, work group, unit, work email/phone, expertise, `is_public`, consent time + who recorded it, status). People are **deactivated, never deleted**.
- `personnel_private` — ONE AES-256-GCM blob (`v1:` + iv + tag + ciphertext, the person's code as authenticated data) holding national id, birth date, gender, address, LINE, Facebook, personal phone and the CV lists (education, work history, training), plus an HMAC of the national id for duplicate detection. Stricter than the Blueprint's per-column encryption; Blueprint's separate education/work/training tables are folded into this blob (they are never public).
- `departments.head_personnel_code` — head of unit (M13 integration).

## RBAC (`lib/cms/permissions.ts`)
| Permission | Roles | Allows |
|---|---|---|
| `personnel:manage` | editor, publisher, admin | create / edit directory fields, deactivate |
| `personnel:publish` | publisher, admin | make a person public (needs `consent: true`, recorded with who and when); edit anyone already public |
| `personnel:private` | admin | read / write the restricted blob. Every read, reveal and write is audited (field names only) |
Officers and viewers have none. The national id is returned masked unless `?reveal=nationalId` (separately audited).

## Public / private separation
`GET /v1/public/personnel` returns active + public + consented people: name, position, rank, work group, unit, **work** email/phone, expertise — no employee code, consent data, restricted data. A unit shows its head publicly only if the head is public. Audit rows never contain values of restricted fields; national ids never appear in URLs or logs. `tests/cms-personnel.test.mjs` asserts all of this.

## Key — READ THIS
`PERSONNEL_KEY` (base64, 32 bytes) lives in `~/rae/rae-cms-secrets/runtime.env` (a copy in `personnel.key`, 0600). Database dumps hold **ciphertext only**, so **a backup of the database without the key cannot be restored to readable personal data and a lost key cannot be recovered**. The owner must keep an offline copy of the key separate from the backups. Without the key the restricted endpoints answer 503 and the directory keeps working. Rotation is not built (the `v1:` prefix leaves room for it).
