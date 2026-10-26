import test from "node:test";
import assert from "node:assert/strict";
import {
  approveNews,
  publishNews,
  returnForRevision,
  submitForReview,
} from "../lib/cms/news-workflow.ts";
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, isSessionExpired, openSession } from "../lib/cms/session.ts";
import { MAX_FAILURES, createLoginThrottle } from "../lib/cms/login-throttle.ts";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";

// Four workflow defects fixed in one place, each asserted here: an officer can hand over
// their own draft, nobody can approve or publish it themselves, a reviewer can send it back
// with a reason, and the session and login clocks are enforced rather than declared.

const draft = (overrides = {}) => ({
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
  const submitted = submitForReview(draft(), officer);
  assert.equal(submitted.status, "review");

  // Both are refused on the permission, which is the point: drafting is not reviewing.
  assert.throws(() => approveNews(submitted, officer), /missing permission news:review/);
  assert.throws(() => publishNews(submitted, officer), /missing permission news:publish/);
});

test("someone else cannot submit a draft on the author's behalf without review rights", () => {
  const other = { id: "someone", role: "officer" };
  assert.throws(() => submitForReview(draft(), other), /missing permission news:review/);
});

test("a reviewer returns an item with a reason and the author resubmits", () => {
  const officer = { id: "officer", role: "officer" };
  const reviewer = { id: "reviewer", role: "editor" };
  const publisher = { id: "publisher", role: "publisher" };

  const submitted = submitForReview(draft(), officer);
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
  assert.equal(publishNews(approved, publisher).status, "published");
});

test("returning needs a reason and a review role", () => {
  const submitted = submitForReview(draft(), { id: "officer", role: "officer" });
  assert.throws(() => returnForRevision(submitted, { id: "reviewer", role: "editor" }, "   "), /reason is required/);
  assert.throws(() => returnForRevision(submitted, { id: "officer", role: "officer" }, "แก้"), /missing permission/);
  assert.throws(() => returnForRevision(draft(), { id: "reviewer", role: "editor" }, "แก้"), /only a submitted/);
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
  const server = createCmsServer({ now: () => nowRef.t });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`, nowRef);
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
