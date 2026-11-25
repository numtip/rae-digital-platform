import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, utimesSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MODULE = pathToFileURL(join(process.cwd(), "lib/cms/withdrawn.ts")).href;

const child = (dir, id) =>
  new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [...process.execArgv, "--input-type=module", "-e", `const m = await import(${JSON.stringify(MODULE)}); m.rememberWithdrawn([${JSON.stringify(id)}]);`],
      { env: { ...process.env, RAE_CMS_DATA_DIR: dir }, stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    proc.stderr.on("data", (d) => (err += d));
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(err))));
  });

test("simultaneous withdrawals from several processes are all kept", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rae-withdrawn-"));
  try {
    const ids = Array.from({ length: 8 }, (_, i) => `story-${i}`);
    await Promise.all(ids.map((id) => child(dir, id)));
    assert.deepEqual(JSON.parse(readFileSync(join(dir, "withdrawn.json"), "utf8")), [...ids].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a lock left by a crashed process is taken over", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rae-withdrawn-"));
  try {
    const lock = join(dir, "withdrawn.json.lock");
    writeFileSync(lock, "");
    const old = new Date(Date.now() - 60000);
    utimesSync(lock, old, old);
    await child(dir, "after-crash");
    assert.deepEqual(JSON.parse(readFileSync(join(dir, "withdrawn.json"), "utf8")), ["after-crash"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
