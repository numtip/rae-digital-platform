import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { DepartmentInvalid, publicDepartments, validateDepartment } from "../lib/cms/department-registry.ts";

const unit = (over) => ({ code: "RAE-DP-0001", parentCode: null, nameTh: "ก", nameEn: "A", descriptionTh: "", descriptionEn: "", sortOrder: 100, status: "published", createdBy: "x", updatedAt: 0, ...over });

test("tree rules: self-parent, loops, missing/archived parent and depth are refused", () => {
  const a = unit({ code: "RAE-DP-0001" });
  const b = unit({ code: "RAE-DP-0002", parentCode: "RAE-DP-0001" });
  const c = unit({ code: "RAE-DP-0003", parentCode: "RAE-DP-0002" });
  const d = unit({ code: "RAE-DP-0004", parentCode: "RAE-DP-0003" });
  const all = [a, b, c, d];
  const base = { nameTh: "ก", nameEn: "A" };
  assert.throws(() => validateDepartment({ ...base, parentCode: "RAE-DP-0001" }, all, a), DepartmentInvalid, "own parent");
  assert.throws(() => validateDepartment({ ...base, parentCode: "RAE-DP-0004" }, all, a), DepartmentInvalid, "loop: root under its own descendant");
  assert.throws(() => validateDepartment({ ...base, parentCode: "RAE-DP-0099" }, all, null), DepartmentInvalid, "missing parent");
  assert.throws(() => validateDepartment({ ...base, parentCode: "RAE-DP-0004" }, all, null), DepartmentInvalid, "a fifth level");
  assert.throws(() => validateDepartment({ ...base, parentCode: "RAE-DP-0001" }, [unit({ status: "archived" })], null), DepartmentInvalid, "archived parent");
  const e = unit({ code: "RAE-DP-0005" });
  assert.throws(() => validateDepartment({ ...base, parentCode: "RAE-DP-0005" }, [...all, e], a), DepartmentInvalid, "moving a 4-level subtree under another unit would exceed the depth");
  assert.equal(validateDepartment({ ...base, parentCode: "RAE-DP-0001" }, all, d).parentCode, "RAE-DP-0001", "moving a leaf up is fine");
  assert.equal(validateDepartment({ ...base, parentCode: "" }, all, null).parentCode, null);
});

test("public tree hides draft/archived units and everything below them", () => {
  const a = unit({ code: "RAE-DP-0001" });
  const b = unit({ code: "RAE-DP-0002", parentCode: "RAE-DP-0001", sortOrder: 5 });
  const c = unit({ code: "RAE-DP-0003", parentCode: "RAE-DP-0002" });
  assert.deepEqual(publicDepartments([a, b, c]).map((d) => d.code), ["RAE-DP-0002", "RAE-DP-0001", "RAE-DP-0003"], "flat list ordered by sortOrder then code; the page builds the tree from parentCode");
  assert.deepEqual(publicDepartments([a, { ...b, status: "draft" }, c]).map((d) => d.code), ["RAE-DP-0001"], "a hidden parent hides its children");
  assert.ok(!("createdBy" in publicDepartments([a])[0]));
});

async function withServer(run) {
  resetRuntime();
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  addUser({ id: "viewer", role: "viewer", password: "viewer-password-123" });
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) => (await (await fetch(`${url}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  const call = (method, path, token, body) => fetch(`${url}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    await run({ call, officer: await login("officer", "officer-password-12"), publisher: await login("publisher", "publisher-password-12"), viewer: await login("viewer", "viewer-password-123") });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("lifecycle: empty by default, draft hidden, publisher publishes, child follows parent, archive hides, no delete surface", async () => {
  await withServer(async ({ call, officer, publisher, viewer }) => {
    const pub = async () => (await (await call("GET", "/v1/public/departments")).json()).departments;
    assert.deepEqual(await pub(), []);
    assert.equal((await call("POST", "/v1/departments", null, { nameTh: "ก", nameEn: "A" })).status, 401);
    assert.equal((await call("POST", "/v1/departments", viewer, { nameTh: "ก", nameEn: "A" })).status, 403);
    const root = await (await call("POST", "/v1/departments", officer, { nameTh: "กอง", nameEn: "Division" })).json();
    assert.equal(root.code, "RAE-DP-0001");
    assert.equal((await call("POST", "/v1/departments", officer, { nameTh: "ก", nameEn: "A", status: "published" })).status, 403);
    const child = await (await call("POST", "/v1/departments", officer, { nameTh: "งาน", nameEn: "Section", parentCode: root.code })).json();
    assert.equal((await call("POST", "/v1/departments", officer, { nameTh: "x", nameEn: "x", parentCode: "RAE-DP-0099" })).status, 400);
    assert.equal((await call("PATCH", `/v1/departments/${root.code}`, officer, { parentCode: child.code })).status, 400, "a loop is refused");
    assert.equal((await pub()).length, 0);
    assert.equal((await call("PATCH", `/v1/departments/${child.code}`, publisher, { status: "published" })).status, 200);
    assert.equal((await pub()).length, 0, "a published child under a draft parent stays hidden");
    assert.equal((await call("PATCH", `/v1/departments/${root.code}`, publisher, { status: "published" })).status, 200);
    assert.deepEqual((await pub()).map((d) => d.code), [root.code, child.code]);
    assert.equal((await call("PATCH", `/v1/departments/${root.code}`, officer, { nameEn: "x" })).status, 403, "editing a published unit is a publisher's decision");
    assert.equal((await call("PATCH", `/v1/departments/${root.code}`, publisher, { status: "archived" })).status, 200);
    assert.equal((await pub()).length, 0, "archiving the parent hides the child");
    assert.equal((await call("DELETE", `/v1/departments/${root.code}`, publisher)).status, 404, "units are archived, never deleted");
  });
});
