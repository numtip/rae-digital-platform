import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { buildOpenApi } from "../lib/cms/openapi.ts";

const spec = buildOpenApi();

test("every public GET route in the runtime is documented, and every documented path exists", () => {
  const source = readFileSync("cms-runtime/server.mjs", "utf8");
  const served = new Set([...source.matchAll(/request\.method === "GET" && url\.pathname === "(\/v1\/public\/[a-z/]+)"/g)].map((m) => m[1]));
  served.add("/v1/public/documents/{code}"); // the one parameterised public read (matched by regex in the runtime)
  const documented = new Set(Object.keys(spec.paths));
  for (const path of served) assert.ok(documented.has(path), `undocumented public route ${path}`);
  for (const path of documented) assert.ok(served.has(path), `documented but not served: ${path}`);
});

test("documented responses match the live shapes (keys, required fields, no internal fields)", async () => {
  resetRuntime();
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  const server = createCmsServer({ contact: { enabled: false } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const token = (await (await fetch(`${url}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "publisher", password: "publisher-password-12" }) })).json()).token;
  const post = (path, body) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try {
    await post("/v1/knowledge", { questionTh: "ก", questionEn: "q", answerTh: "ข", answerEn: "a", status: "published" });
    await post("/v1/events", { titleTh: "ก", titleEn: "e", startsAt: "2026-12-05T09:00:00+07:00", status: "published" });
    await post("/v1/departments", { nameTh: "ก", nameEn: "d", status: "published" });
    await post("/v1/announcements", { kind: "banner", titleTh: "ก", titleEn: "a", startsAt: "2020-01-01T00:00:00+07:00", endsAt: "2099-01-01T00:00:00+07:00", status: "published" });
    await post("/v1/documents", { category: "administration", titleTh: "ก", titleEn: "d", storageUrl: "https://maejo365-my.sharepoint.com/:b:/g/personal/rae/Abc/x.pdf", status: "current" });
    const resolve = (ref) => spec.components.schemas[ref.split("/").pop()];
    for (const [path, item] of Object.entries(spec.paths)) {
      const concrete = path.replace("{code}", "RAE-DC-0001");
      const res = await fetch(`${url}${concrete}`);
      assert.equal(res.status, 200, concrete);
      const body = await res.json();
      const schema = (item.get.responses["200"].content["application/json"].schema);
      for (const key of schema.required ?? []) assert.ok(key in body, `${concrete}: missing ${key}`);
      const rows = schema.properties && Object.values(schema.properties).find((p) => p.type === "array");
      const sample = rows ? body[Object.keys(schema.properties).find((k) => schema.properties[k] === rows)][0] : schema.$ref ? body : null;
      const rowSchema = rows ? resolve(rows.items.$ref) : schema.$ref ? resolve(schema.$ref) : null;
      if (rowSchema) {
        assert.ok(sample, `${concrete}: expected one sample row`);
        for (const key of rowSchema.required) assert.ok(key in sample, `${concrete}: row missing ${key}`);
        for (const key of Object.keys(sample)) assert.ok(key in rowSchema.properties, `${concrete}: undocumented field ${key}`);
        for (const secret of ["createdBy", "storageUrl", "status", "visibility", "linkStatus"]) assert.ok(!(secret in sample), `${concrete}: leaks ${secret}`);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
