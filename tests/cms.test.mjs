import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createAuditLog } from "../lib/cms/audit.ts";
import { assertSharePointFileUrl, DocumentLinkError } from "../lib/cms/documents.ts";
import { detectAllowedMedia, MediaRejected } from "../lib/cms/media.ts";
import { approveNews, publishNews, submitForReview, WorkflowError } from "../lib/cms/news-workflow.ts";
import { PermissionDenied, requirePermission } from "../lib/cms/permissions.ts";
import { publishedArticlesForExport } from "../lib/cms/publish.ts";
import { createSessionToken, hashSessionToken } from "../lib/cms/session.ts";
import { assertBilingual, assertLocalPassword, ContentValidationError } from "../lib/cms/validation.ts";

const author = { id: "author", role: "editor" };
const reviewer = { id: "reviewer", role: "editor" };
const publisher = { id: "publisher", role: "publisher" };

function draft(pinned = false) {
  return {
    id: "fixture-1",
    status: "draft",
    pinned,
    authorId: author.id,
    titleTh: "ตัวอย่าง",
    titleEn: "Fixture",
    source: "https://rae.mju.ac.th/wtms_index.aspx",
  };
}

test("officer cannot review or publish", () => {
  assert.throws(() => requirePermission("officer", "news:publish"), PermissionDenied);
  assert.throws(() => submitForReview(draft(), { id: "officer", role: "officer" }), PermissionDenied);
});

test("pinned news needs three different people", () => {
  const reviewed = submitForReview(draft(true), author);
  const approved = approveNews(reviewed, reviewer);
  assert.throws(() => publishNews(approved, { id: reviewer.id, role: "publisher" }), WorkflowError);
  const published = publishNews(approved, publisher);
  assert.equal(published.status, "published");
});

test("a non-https source cannot be submitted or exported", () => {
  const bad = { ...draft(), source: "javascript:alert(1)" };
  assert.throws(() => submitForReview(bad, author), WorkflowError);
  assert.throws(() => publishedArticlesForExport([{ ...draft(), status: "published", source: "http://example.com/a" }]));
});

test("drafts never enter the public export", () => {
  const reviewed = submitForReview(draft(), author);
  assert.deepEqual(publishedArticlesForExport([reviewed]), []);
  const published = publishNews(approveNews(reviewed, reviewer), publisher);
  assert.equal(publishedArticlesForExport([published]).length, 1);
});

test("bilingual fields and passwords are validated", () => {
  assert.throws(() => assertBilingual({ titleTh: "ไทย", titleEn: "", source: "https://example.com" }), ContentValidationError);
  assert.throws(() => assertLocalPassword("short"), ContentValidationError);
});

test("document links stay on the MJU SharePoint host", () => {
  const ok = assertSharePointFileUrl("https://maejo365-my.sharepoint.com/sites/rae/doc.pdf");
  assert.equal(ok.hostname, "maejo365-my.sharepoint.com");
  assert.throws(() => assertSharePointFileUrl("https://example.com/doc.pdf"), DocumentLinkError);
  assert.throws(() => assertSharePointFileUrl("https://maejo365-my.sharepoint.com/sites/rae/folder"), DocumentLinkError);
});

test("media allow-list rejects executables", () => {
  assert.equal(detectAllowedMedia(Uint8Array.from([0x25, 0x50, 0x44, 0x46])), "application/pdf");
  assert.throws(() => detectAllowedMedia(Uint8Array.from([0x4d, 0x5a, 0x00])), MediaRejected);
});

test("audit log is append-only and sessions store only a hash", () => {
  const log = createAuditLog();
  log.append({
    actorId: reviewer.id,
    action: "news.approve",
    entityType: "news",
    entityId: "fixture-1",
    before: { status: "review" },
    after: { status: "approved" },
    requestId: "req-1",
    createdAt: "2026-10-26T00:00:00Z",
  });
  assert.equal(log.list().length, 1);
  assert.equal(typeof log.update, "undefined");
  const session = createSessionToken();
  assert.equal(session.tokenHash, hashSessionToken(session.token));
  assert.notEqual(session.tokenHash, session.token);
  assert.equal(session.tokenHash, createHash("sha256").update(session.token).digest("hex"));
});

test("admin page is noindex and is not linked from the public home", () => {
  const page = readFileSync("app/[locale]/cms-admin/page.tsx", "utf8");
  const home = readFileSync("app/[locale]/page.tsx", "utf8");
  assert.match(page, /index:\s*false/);
  assert.equal(home.includes("cms-admin"), false);
});
