# ADR-0001 — Modular monolith on a Node runtime

- **Status:** Proposed (awaiting owner approval, gate A-1)
- **Date:** 2026-10-24
- **Deciders:** RAE director, platform owner, MJU IT
- **Context doc:** `../RAE_PLATFORM_ARCHITECTURE.md §8`

## Context

The platform must deliver a public website, a CMS/administration layer with RBAC and approval
workflow, and roughly a dozen operational modules (letters, assets, fleet, rooms, forms,
complaints, reports). The requirement inventory (`docs/research/requirements/exitfull.txt`)
is an application specification, not a content site: it needs audit trails, exports, uploads
and per-module permissions.

Three options were evaluated:

1. **Modular monolith** — one Next.js application (public + admin + `/api/v1`), MySQL, one worker.
2. **Split** — static public site + separate admin/API application.
3. **Headless CMS** (Payload/Directus/Strapi) + custom modules.

## Decision

Adopt **Option 1**.

Weighted scoring (requirement fit 25 %, security 20 %, ops simplicity 20 %, public performance
15 %, maintainability 10 %, delivery speed 10 %): **4.45 / 3.65 / 3.35**.

## Rationale

- Almost every requirement is an application concern that a content CMS cannot satisfy; two
  identity systems and two content schemas would cost more than they save.
- A second deployable doubles the operational surface a small RAE team must maintain weekly.
- Public performance targets are still reachable with ISR plus an nginx cache.

## Consequences

- Public and admin share a process → mitigated by route groups, middleware guard, per-route
  `requirePermission`, separate cookies and stricter headers on `/admin`.
- Scaling is vertical first; the admin app can be split out later without changing the schema.
- **If MJU hosting forbids a public Node runtime, this ADR is void** and Option 2 applies.

## Alternatives rejected

- Option 2: better isolation, but two build pipelines, publish latency and duplicated content types.
- Option 3: fastest admin baseline, but workflow, numbering, audit and tenancy all need custom code anyway.
