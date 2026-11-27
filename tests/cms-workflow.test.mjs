import test from "node:test";
import assert from "node:assert/strict";
import { publishedArticlesForExport } from "../lib/cms/publish.ts";
import {
  approveNews,
  publishNews,
  returnForRevision,
  revisePublished,
  submitForReview,
  unpublishNews,
} from "../lib/cms/news-workflow.ts";
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, isSessionExpired, openSession } from "../lib/cms/session.ts";
import { MAX_FAILURES, createLoginThrottle } from "../lib/cms/login-throttle.ts";
import { addUser, createCmsServer, memoryRepository, resetRuntime, startRuntime } from "../cms-runtime/server.mjs";

// Four workflow defects fixed in one place, each asserted here: an officer can hand over
// their own draft, nobody can approve or publish it themselves, a reviewer can send it back
// with a reason, and the session and login clocks are enforced rather than declared.

const draftFixture = (overrides = {}) => ({
  id: "n1",
  status: "draft",
  pinned: false,
  authorId: "officer",
  titleTh: "ข่าว",
  titleEn: "News",
  source: "https://rae.mju.ac.th/example",
  ...overrides,
});

test("an officer submits their own draft but cannot approve or publish it", () => {
  const officer = { id: "officer", role: "officer" };
  const submitted = submitForReview(draftFixture(), officer);
  assert.equal(submitted.status, "review");

  // Both are refused on the permission, which is the point: drafting is not reviewing.
  assert.throws(() => approveNews(submitted, officer), /missing permission news:review/);
  assert.throws(() => publishNews(submitted, officer), /missing permission news:publish/);
});

test("someone else cannot submit a draft on the author's behalf without review rights", () => {
  const other = { id: "someone", role: "officer" };
  assert.throws(() => submitForReview(draftFixture(), other), /missing permission news:review/);
});

test("a reviewer returns an item with a reason and the author resubmits", () => {
  const officer = { id: "officer", role: "officer" };
  const reviewer = { id: "reviewer", role: "editor" };
  const publisher = { id: "publisher", role: "publisher" };

  const submitted = submitForReview(draftFixture(), officer);
  const returned = returnForRevision(submitted, reviewer, "  ขอภาพประกอบและแหล่งอ้างอิง  ");
  assert.equal(returned.status, "draft");
  assert.equal(returned.revisionReason, "ขอภาพประกอบและแหล่งอ้างอิง");
  assert.equal(returned.returnedBy, "reviewer");
  assert.equal(returned.reviewerId, undefined, "an earlier approval must not survive a return");

  const edited = { ...returned, titleEn: "News, with a photo" };
  const resubmitted = submitForReview(edited, officer);
  assert.equal(resubmitted.status, "review");
  assert.equal(resubmitted.revisionReason, undefined, "the reason is cleared when the author resubmits");

  const approved = approveNews(resubmitted, reviewer);
  assert.equal(approved.status, "approved");
  const released = publishNews(approved, publisher);
  assert.equal(released.status, "published");
  // The date the site shows is stamped when the item is published, never when it was exported.
  assert.match(released.publishedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("returning needs a reason and a review role", () => {
  const submitted = submitForReview(draftFixture(), { id: "officer", role: "officer" });
  assert.throws(() => returnForRevision(submitted, { id: "reviewer", role: "editor" }, "   "), /reason is required/);
  assert.throws(() => returnForRevision(submitted, { id: "officer", role: "officer" }, "แก้"), /missing permission/);
  assert.throws(() => returnForRevision(draftFixture(), { id: "reviewer", role: "editor" }, "แก้"), /only a submitted/);
});

test("a session expires after 30 idle minutes and after 8 hours in total", () => {
  const start = 1_000_000;
  const session = openSession("officer", start);
  assert.equal(SESSION_IDLE_MS, 30 * 60 * 1000);
  assert.equal(SESSION_ABSOLUTE_MS, 8 * 60 * 60 * 1000);
  assert.equal(isSessionExpired(session, start + SESSION_IDLE_MS - 1), false);
  assert.equal(isSessionExpired(session, start + SESSION_IDLE_MS), true);

  // Kept warm every 10 minutes, it still dies at the absolute cap.
  const warm = { ...session, lastSeenAt: start + SESSION_ABSOLUTE_MS - 60 * 1000 };
  assert.equal(isSessionExpired(warm, start + SESSION_ABSOLUTE_MS), true);
});

test("five failed logins block the account for fifteen minutes, then allow a success", () => {
  const throttle = createLoginThrottle();
  const t0 = 5_000_000;
  for (let i = 0; i < MAX_FAILURES; i += 1) {
    assert.equal(throttle.isBlocked("officer", t0 + i), false);
    throttle.recordFailure("officer", t0 + i);
  }
  assert.equal(throttle.isBlocked("officer", t0 + 10), true);
  assert.equal(throttle.isBlocked("other-user", t0 + 10), false, "one account's failures must not lock another");
  assert.equal(throttle.isBlocked("officer", t0 + 15 * 60 * 1000), false, "the window must slide");
});

async function withServer(run, { nowRef }) {
  resetRuntime();
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  addUser({ id: "reviewer", role: "editor", password: "reviewer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  // The repository is handed to the test so it can read the audit rows the routes write.
  const repository = memoryRepository();
  const server = createCmsServer({ now: () => nowRef.t, repository });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`, nowRef, repository);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const auth = (token) => ({ "content-type": "application/json", authorization: `Bearer ${token}` });

test("the runtime enforces both clocks, throttles logins and exposes the return route", async () => {
  const nowRef = { t: 1_700_000_000_000 };
  await withServer(async (base) => {
    const login = await fetch(`${base}/v1/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "officer", password: "officer-password-12" }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();

    // idle timeout: 30 minutes without a request ends the session
    nowRef.t += SESSION_IDLE_MS;
    const stale = await fetch(`${base}/v1/news`, { headers: auth(token) });
    assert.equal(stale.status, 401, "an idle session must stop working");

    // a warm session survives, but not past the absolute cap
    const again = await fetch(`${base}/v1/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "officer", password: "officer-password-12" }),
    });
    const { token: warm } = await again.json();
    nowRef.t += 10 * 60 * 1000;
    assert.equal((await fetch(`${base}/v1/news`, { headers: auth(warm) })).status, 200);
    nowRef.t += SESSION_ABSOLUTE_MS;
    assert.equal((await fetch(`${base}/v1/news`, { headers: auth(warm) })).status, 401);

    // login throttling: five failures, then 429 even with the right password
    nowRef.t += 25 * 60 * 1000;
    for (let i = 0; i < MAX_FAILURES; i += 1) {
      const bad = await fetch(`${base}/v1/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "publisher", password: "wrong-password-12" }),
      });
      assert.equal(bad.status, 401);
    }
    const blocked = await fetch(`${base}/v1/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "publisher", password: "publisher-password-12" }),
    });
    assert.equal(blocked.status, 429);
    nowRef.t += 15 * 60 * 1000;
    const recovered = await fetch(`${base}/v1/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "publisher", password: "publisher-password-12" }),
    });
    assert.equal(recovered.status, 200, "the account works again once the window slides");
  }, { nowRef });
});

test("over the API an officer submits, a reviewer returns it, and the officer resubmits", async () => {
  const nowRef = { t: 1_700_100_000_000 };
  await withServer(async (base) => {
    const token = async (userId, password) => {
      const response = await fetch(`${base}/v1/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      return (await response.json()).token;
    };
    const officer = await token("officer", "officer-password-12");
    const reviewer = await token("reviewer", "reviewer-password-12");

    const created = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(officer),
      body: JSON.stringify({ id: "n9", titleTh: "ข่าว", titleEn: "News", source: "https://rae.mju.ac.th/x" }),
    });
    assert.equal(created.status, 201);

    const submitted = await fetch(`${base}/v1/news/n9/submit`, { method: "POST", headers: auth(officer) });
    assert.equal(submitted.status, 200, "an officer must be able to hand over their own draft");

    const returned = await fetch(`${base}/v1/news/n9/return`, {
      method: "POST",
      headers: auth(reviewer),
      body: JSON.stringify({ reason: "ขอแหล่งอ้างอิงเพิ่ม" }),
    });
    assert.equal(returned.status, 200);
    const returnedBody = await returned.json();
    assert.equal(returnedBody.status, "draft");
    assert.equal(returnedBody.revisionReason, "ขอแหล่งอ้างอิงเพิ่ม");

    // the author can edit again because the item is a draft
    const edited = await fetch(`${base}/v1/news/n9`, {
      method: "PATCH",
      headers: auth(officer),
      body: JSON.stringify({ titleEn: "News, revised" }),
    });
    assert.equal(edited.status, 200);

    const resubmitted = await fetch(`${base}/v1/news/n9/submit`, { method: "POST", headers: auth(officer) });
    assert.equal(resubmitted.status, 200);
    assert.equal((await resubmitted.json()).revisionReason, undefined);

    const stillDraft = await fetch(`${base}/v1/export`, { headers: auth(reviewer) });
    assert.deepEqual((await stillDraft.json()).articles, [], "nothing unpublished may reach the export");
  }, { nowRef });
});

// Approved publishing policy (owner decision 2026-10-27): an officer drafts, a reviewer
// approves or returns, and a publisher may release their own item only on someone else's
// approval; a pinned item keeps three distinct participants.

const roles = {
  officer: { id: "officer", role: "officer" },
  reviewer: { id: "reviewer", role: "editor" },
  publisher: { id: "publisher", role: "publisher" },
  otherPublisher: { id: "publisher-2", role: "publisher" },
};

test("a publisher may publish their own draft only after another person approved it", () => {
  const author = roles.publisher;
  const draft = { ...draftFixture(), authorId: author.id };
  const submitted = submitForReview(draft, author);
  assert.throws(() => publishNews(submitted, author), /only an approved item/);

  const approved = approveNews(submitted, roles.reviewer);
  const published = publishNews(approved, author);
  assert.equal(published.status, "published");
  assert.equal(published.publisherId, author.id);
  assert.equal(published.reviewerId, roles.reviewer.id);
});

test("an approval recorded by the author does not count for publishing", () => {
  const selfApproved = { ...draftFixture(), status: "approved", reviewerId: "officer", authorId: "officer" };
  assert.throws(() => publishNews(selfApproved, roles.publisher), /someone other than the author/);
});

test("a pinned item keeps three distinct participants", () => {
  // Everyone here holds the rights the role needs, so a refusal can only come from the
  // pinned rule itself and not from a missing permission.
  const author = { id: "publisher-1", role: "publisher" };
  const reviewer = { id: "reviewer-admin", role: "admin" };
  const thirdPublisher = { id: "publisher-3", role: "publisher" };

  const pinnedDraft = { ...draftFixture(), pinned: true, authorId: author.id };
  const approved = approveNews(submitForReview(pinnedDraft, author), reviewer);

  assert.throws(() => publishNews(approved, author), /not the author/);
  assert.throws(() => publishNews(approved, reviewer), /not the reviewer/);

  const published = publishNews(approved, thirdPublisher);
  assert.equal(published.status, "published");
  assert.notEqual(published.publisherId, published.authorId);
  assert.notEqual(published.publisherId, published.reviewerId);
});

test("draft, review and returned items never reach the public export", () => {
  const base = draftFixture();
  const states = [
    { ...base, id: "d", status: "draft" },
    { ...base, id: "r", status: "review" },
    { ...base, id: "b", status: "draft", revisionReason: "ขอภาพประกอบ", returnedBy: "reviewer" },
    { ...base, id: "p", status: "published", reviewerId: "reviewer", publisherId: "publisher" },
  ];
  const exported = publishedArticlesForExport(states);
  assert.deepEqual(exported.map((item) => item.id), ["p"]);
  // A row published before the column existed exports null, not a stand-in date.
  assert.equal(exported[0].publishedAt, null);
});

test("a duplicate id is rejected instead of overwriting the existing article", async () => {
  resetRuntime();
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(`${base}/v1/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "officer", password: "officer-password-12" }),
    });
    const { token } = await login.json();
    const headers = auth(token);

    const first = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: "dup-1", titleTh: "เดิม", titleEn: "Original", source: "https://rae.mju.ac.th/1" }),
    });
    assert.equal(first.status, 201);
    await fetch(`${base}/v1/news/dup-1/submit`, { method: "POST", headers });

    const second = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: "dup-1", titleTh: "ทับ", titleEn: "Overwrite", source: "https://rae.mju.ac.th/2" }),
    });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error, "DUPLICATE_ID");

    // the original survives untouched, workflow state included
    const listed = await (await fetch(`${base}/v1/news`, { headers })).json();
    const kept = listed.articles.find((item) => item.id === "dup-1");
    assert.equal(kept.titleEn, "Original");
    assert.equal(kept.status, "review");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    resetRuntime();
  }
});

test("the service refuses to start without a database", async () => {
  await assert.rejects(() => startRuntime({}), /RAE_CMS_DB_HOST is required/);
  // memory stays available for tests: createCmsServer() still starts with no environment
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  assert.ok(server.address().port > 0);
  await new Promise((resolve) => server.close(resolve));
});

test("the listener is loopback unless the environment says otherwise", async () => {
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  assert.equal(server.address().address, "127.0.0.1");
  await new Promise((resolve) => server.close(resolve));
  // startRuntime() without a database never reaches the listener, so this is the guarantee the
  // container relies on: the published port, not the bind address, keeps it private.
  await assert.rejects(() => startRuntime({ RAE_CMS_API_BIND: "0.0.0.0" }), /RAE_CMS_DB_HOST is required/);
});

// ---- editorial lifecycle: taking a story down, and correcting one that is already live ----
//
// A published article can be withdrawn — out of the export, with a reason, one audit row — or
// reopened as a revision: it leaves the export only when the corrected text is published, and
// until then the site keeps reading the state frozen at the previous publication.

const publishedFixture = (overrides = {}) => ({
  ...draftFixture(),
  status: "published",
  reviewerId: "reviewer",
  publisherId: "publisher",
  revisionNo: 1,
  publishedAt: "2026-10-01T09:00:00.000Z",
  bodyTh: ["เนื้อหาที่เผยแพร่แล้ว"],
  bodyEn: ["The published body"],
  publishedSnapshot: {
    titleTh: "ข่าว",
    titleEn: "News",
    source: "https://rae.mju.ac.th/example",
    bodyTh: ["เนื้อหาที่เผยแพร่แล้ว"],
    bodyEn: ["The published body"],
    publishedAt: "2026-10-01T09:00:00.000Z",
  },
  ...overrides,
});

const PASSWORDS = {
  officer: "officer-password-12",
  reviewer: "reviewer-password-12",
  publisher: "publisher-password-12",
};

async function signIn(base, userId) {
  const response = await fetch(`${base}/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, password: PASSWORDS[userId] }),
  });
  return (await response.json()).token;
}

/** Runs the five existing transitions, so a test starts from a story that is really live. */
async function publishedThroughDesk(base, id, bodyTh = ["เนื้อหาเดิม"]) {
  const officer = await signIn(base, "officer");
  const reviewer = await signIn(base, "reviewer");
  const publisher = await signIn(base, "publisher");
  const created = await fetch(`${base}/v1/news`, {
    method: "POST",
    headers: auth(officer),
    body: JSON.stringify({ id, titleTh: "ข่าว", titleEn: "News", source: "https://rae.mju.ac.th/example", bodyTh }),
  });
  assert.equal(created.status, 201);
  for (const [step, token] of [["submit", officer], ["approve", reviewer], ["publish", publisher]]) {
    const response = await fetch(`${base}/v1/news/${id}/${step}`, { method: "POST", headers: auth(token) });
    assert.equal(response.status, 200, `${step} must succeed on a fresh story`);
  }
  return { officer, reviewer, publisher };
}

const exportedArticles = async (base, token) =>
  (await (await fetch(`${base}/v1/export`, { headers: auth(token) })).json()).articles;

test("a publisher withdraws a published item with a reason and the row keeps what was live", () => {
  const withdrawn = unpublishNews(publishedFixture(), roles.publisher, "  ข้อความคลาดเคลื่อน  ");
  assert.equal(withdrawn.status, "withdrawn");
  assert.equal(withdrawn.withdrawalReason, "ข้อความคลาดเคลื่อน");
  assert.equal(withdrawn.withdrawnBy, "publisher");
  assert.match(withdrawn.withdrawnAt, /^\d{4}-\d{2}-\d{2}T/);
  // Nothing is deleted: the body it was published with stays on the row for the audit's sake.
  assert.deepEqual(withdrawn.bodyTh, ["เนื้อหาที่เผยแพร่แล้ว"]);
  assert.deepEqual(withdrawn.publishedSnapshot.bodyTh, ["เนื้อหาที่เผยแพร่แล้ว"]);
});

test("withdrawing needs publish rights, a published item and a reason", () => {
  assert.throws(() => unpublishNews(publishedFixture(), roles.officer, "แก้"), /missing permission news:publish/);
  assert.throws(() => unpublishNews(publishedFixture(), roles.reviewer, "แก้"), /missing permission news:publish/);
  assert.throws(
    () => unpublishNews(publishedFixture({ status: "draft" }), roles.publisher, "แก้"),
    /only a published item/,
  );
  assert.throws(() => unpublishNews(publishedFixture(), roles.publisher, "   "), /reason is required/);
  const withdrawn = unpublishNews(publishedFixture(), roles.publisher, "แก้");
  assert.throws(() => unpublishNews(withdrawn, roles.publisher, "แก้"), /only a published item/);
});

test("a published item is revised, re-approved and republished, bumping revision_no once", () => {
  const original = publishedFixture();
  const revised = revisePublished(original, roles.officer);
  assert.equal(revised.status, "revision");
  assert.equal(revised.reviewerId, undefined, "the earlier approval does not carry over");
  assert.equal(revised.publisherId, undefined);
  assert.equal(revised.withdrawnAt, undefined, "a revision is not a withdrawal");
  assert.deepEqual(revised.publishedSnapshot, original.publishedSnapshot, "the live version is untouched");

  // The author edits the row; the export still serves the published text while it is open.
  const edited = { ...revised, bodyTh: ["เนื้อหาที่แก้ไข"], bodyEn: ["The corrected body"] };
  assert.deepEqual(publishedArticlesForExport([edited])[0].bodyTh, ["เนื้อหาที่เผยแพร่แล้ว"]);

  const review = submitForReview(edited, roles.officer);
  assert.equal(review.status, "review");
  const approved = approveNews(review, roles.reviewer);
  assert.equal(approved.status, "approved");
  assert.equal(approved.revisionNo, 1, "approval is not a publication");
  const republished = publishNews(approved, roles.publisher);
  assert.equal(republished.status, "published");
  assert.equal(republished.revisionNo, 2, "exactly one bump per republication");
  assert.deepEqual(publishedArticlesForExport([republished])[0].bodyTh, ["เนื้อหาที่แก้ไข"]);
});

test("only the author or a reviewer opens a revision, and only on a published item", () => {
  // An officer editing someone else's live story needs review rights, exactly as when submitting.
  assert.throws(
    () => revisePublished(publishedFixture({ authorId: "someone-else" }), roles.officer),
    /missing permission news:review/,
  );
  assert.throws(() => revisePublished(publishedFixture({ status: "draft" }), roles.officer), /only a published item/);
  assert.throws(
    () => revisePublished(publishedFixture({ status: "withdrawn" }), roles.publisher),
    /only a published item/,
  );
  const theirs = revisePublished(publishedFixture({ authorId: "someone-else" }), roles.reviewer);
  assert.equal(theirs.status, "revision");
});

test("withdrawn items leave the export and a revision still exports the last published body", () => {
  const base = publishedFixture();
  const exported = publishedArticlesForExport([
    { ...base, id: "live" },
    { ...base, id: "open", status: "revision", bodyTh: ["ยังไม่อนุมัติ"] },
    // A revision that a reviewer sent back is still the published story until it is re-released.
    { ...base, id: "sent-back", status: "draft", revisionReason: "ขอแก้ตัวเลข", bodyTh: ["ยังไม่อนุมัติ"] },
    { ...base, id: "gone", status: "withdrawn", withdrawalReason: "ถอน" },
  ]);
  assert.deepEqual(exported.map((item) => item.id), ["live", "open", "sent-back"]);
  assert.deepEqual(exported[1].bodyTh, ["เนื้อหาที่เผยแพร่แล้ว"], "the approved version is what is live");
  assert.equal(exported[1].publishedAt, "2026-10-01T09:00:00.000Z", "a revision does not restate the date");
  assert.deepEqual(exported[2].bodyTh, ["เนื้อหาที่เผยแพร่แล้ว"]);
  // A row that was never published has no live version to serve, whatever state it is in.
  assert.deepEqual(
    publishedArticlesForExport([
      { ...base, id: "orphan", status: "revision", publishedSnapshot: undefined },
      { ...base, id: "fresh", status: "review", publishedSnapshot: undefined, revisionNo: 0 },
    ]),
    [],
  );
});

test("over the API a publisher withdraws a story, it leaves the export, and the audit says so", async () => {
  const nowRef = { t: 1_700_200_000_000 };
  await withServer(async (base, _now, repository) => {
    const { officer, publisher } = await publishedThroughDesk(base, "w1");
    assert.deepEqual((await exportedArticles(base, officer)).map((item) => item.id), ["w1"]);

    const refused = await fetch(`${base}/v1/news/w1/unpublish`, {
      method: "POST",
      headers: auth(officer),
      body: JSON.stringify({ reason: "คลาดเคลื่อน" }),
    });
    assert.equal(refused.status, 403, "an officer holds no publish right");

    const withdrawn = await fetch(`${base}/v1/news/w1/unpublish`, {
      method: "POST",
      headers: auth(publisher),
      body: JSON.stringify({ reason: "  ข้อความคลาดเคลื่อน  " }),
    });
    assert.equal(withdrawn.status, 200);
    const record = await withdrawn.json();
    assert.equal(record.status, "withdrawn");
    assert.equal(record.withdrawalReason, "ข้อความคลาดเคลื่อน");
    assert.equal(record.withdrawnBy, "publisher");

    assert.deepEqual(await exportedArticles(base, officer), [], "a withdrawn story is not served");

    const rows = (await repository.listAudit()).filter((row) => row.entityId === "w1");
    assert.deepEqual(rows.map((row) => row.action), ["news.draft", "news.submit", "news.approve", "news.publish", "news.unpublish"]);
    const last = rows.at(-1);
    assert.deepEqual(last.before, { status: "published" });
    assert.deepEqual(last.after, { status: "withdrawn", reason: "ข้อความคลาดเคลื่อน" });
    assert.equal(last.actorId, "publisher");
  }, { nowRef });
});

test("over the API a revision keeps the published body exported until it is published", async () => {
  const nowRef = { t: 1_700_300_000_000 };
  await withServer(async (base, _now, repository) => {
    const { officer, reviewer, publisher } = await publishedThroughDesk(base, "r1", ["เนื้อหาเดิม"]);
    const [firstRelease] = await exportedArticles(base, officer);

    const revised = await fetch(`${base}/v1/news/r1/revise`, { method: "POST", headers: auth(officer) });
    assert.equal(revised.status, 200);
    assert.equal((await revised.json()).status, "revision");

    const edited = await fetch(`${base}/v1/news/r1`, {
      method: "PATCH",
      headers: auth(officer),
      body: JSON.stringify({ bodyTh: ["เนื้อหาใหม่"], bodyEn: ["The corrected body"] }),
    });
    assert.equal(edited.status, 200, "the author edits the revision like a draft");

    const whileOpen = await exportedArticles(base, officer);
    assert.deepEqual(whileOpen, [firstRelease], "the live story is unchanged while the revision is open");

    assert.equal((await fetch(`${base}/v1/news/r1/submit`, { method: "POST", headers: auth(officer) })).status, 200);
    assert.equal((await fetch(`${base}/v1/news/r1/approve`, { method: "POST", headers: auth(reviewer) })).status, 200);

    const stillOld = await exportedArticles(base, officer);
    assert.deepEqual(stillOld[0].bodyTh, ["เนื้อหาเดิม"], "approval alone does not change the site");

    const republished = await fetch(`${base}/v1/news/r1/publish`, { method: "POST", headers: auth(publisher) });
    assert.equal(republished.status, 200);
    assert.equal((await republished.json()).revisionNo, 2);

    const afterRepublish = await exportedArticles(base, officer);
    assert.deepEqual(afterRepublish[0].bodyTh, ["เนื้อหาใหม่"]);

    // One row per request: opening the revision, then the republish, both recorded as revisions.
    const revisions = (await repository.listAudit())
      .filter((row) => row.entityId === "r1" && row.action === "news.revise")
      .map((row) => [row.before.status, row.after.status]);
    assert.deepEqual(revisions, [["published", "revision"], ["approved", "published"]]);
  }, { nowRef });
});

test("the runtime refuses a revise or an unpublish the workflow does not allow", async () => {
  const nowRef = { t: 1_700_400_000_000 };
  await withServer(async (base) => {
    const { officer, reviewer, publisher } = await publishedThroughDesk(base, "x1");

    const noReason = await fetch(`${base}/v1/news/x1/unpublish`, {
      method: "POST",
      headers: auth(publisher),
      body: JSON.stringify({ reason: "  " }),
    });
    assert.equal(noReason.status, 400, "a withdrawal without a reason is refused");

    const stillPublished = await (await fetch(`${base}/v1/news`, { headers: auth(officer) })).json();
    assert.equal(stillPublished.articles.find((item) => item.id === "x1").status, "published");

    const notPublished = await fetch(`${base}/v1/news/x1/unpublish`, {
      method: "POST",
      headers: auth(publisher),
      body: JSON.stringify({ reason: "แก้" }),
    });
    assert.equal(notPublished.status, 200);
    const again = await fetch(`${base}/v1/news/x1/unpublish`, {
      method: "POST",
      headers: auth(publisher),
      body: JSON.stringify({ reason: "แก้" }),
    });
    assert.equal(again.status, 400, "a withdrawn item cannot be withdrawn twice");

    // A draft cannot be revised, and a published item cannot be edited in place.
    const draft = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(officer),
      body: JSON.stringify({ id: "x2", titleTh: "ข่าว", titleEn: "News", source: "https://rae.mju.ac.th/x2" }),
    });
    assert.equal(draft.status, 201);
    assert.equal((await fetch(`${base}/v1/news/x2/revise`, { method: "POST", headers: auth(officer) })).status, 400);

    const locked = await fetch(`${base}/v1/news/x1`, {
      method: "PATCH",
      headers: auth(officer),
      body: JSON.stringify({ titleEn: "Edited in place" }),
    });
    assert.equal(locked.status, 400);

    // A revision belongs to its author: a reviewer may open one but not type into it.
    await publishedThroughDesk(base, "x3");
    assert.equal((await fetch(`${base}/v1/news/x3/revise`, { method: "POST", headers: auth(reviewer) })).status, 200);
    const foreignEdit = await fetch(`${base}/v1/news/x3`, {
      method: "PATCH",
      headers: auth(reviewer),
      body: JSON.stringify({ titleEn: "Not mine" }),
    });
    assert.equal(foreignEdit.status, 403);
  }, { nowRef });
});
