import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// The sync is the only thing that puts published CMS articles into the committed site data, so
// these checks are about the three cases the pipeline depends on: a refused export writes nothing,
// an unsafe id never becomes a path, and an unchanged export leaves the tree byte-for-byte alone
// (otherwise every run would open a pull request). The CMS itself is never contacted: a loopback
// server stands in for it.

const script = fileURLToPath(new URL("../scripts/cms-sync.mjs", import.meta.url));
const token = "test-token";
const article = {
  id: "testing-sync-20261028",
  status: "published",
  titleTh: "ทดสอบการซิงก์ข่าว",
  titleEn: "Testing the news sync",
  source: "https://example.org/news",
  bodyTh: ["ย่อหน้าที่หนึ่ง"],
  bodyEn: ["First paragraph"],
  publishedAt: "2026-10-28T03:00:00.000Z",
  media: [
    {
      url: "/v1/media/testing-sync-20261028/01-a1b2c3d4.jpg",
      captionTh: "ภาพทดสอบ",
      captionEn: "Test photo",
      altTh: "ภาพทดสอบ",
      altEn: "Test photo",
    },
  ],
};

// A stand-in for the CMS export endpoint, with the same one-token rule the real runtime has: a
// request without the bearer is refused, so the script provably sends it.
async function withExport(payload, images, run) {
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401);
      response.end();
      return;
    }
    if (request.url === "/v1/export") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
      return;
    }
    const image = images[request.url];
    if (!image) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200);
    response.end(image);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function sync(api, out) {
  return new Promise((resolve) => {
    // Async on purpose: the fixture server lives in this process, so a blocking spawn would
    // deadlock with it.
    const child = spawn(process.execPath, [script, "--api", api, "--out", out], {
      env: { ...process.env, RAE_CMS_TOKEN: token, RAE_CMS_TOKEN_FILE: "" },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code, output }));
  });
}

const tempDir = () => mkdtempSync(join(tmpdir(), "rae-cms-sync-"));

// Path, size and mtime of every file, so "did not touch it" is checked rather than assumed.
function snapshot(dir) {
  const walk = (at) =>
    readdirSync(at).flatMap((name) => {
      const full = join(at, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return Object.fromEntries(
    walk(dir).map((file) => [
      relative(dir, file),
      `${statSync(file).size}:${statSync(file).mtimeMs}:${createHash("sha1").update(readFileSync(file)).digest("hex")}`,
    ]),
  );
}

test("a draft, a half-translated article or an unsafe id is refused and writes nothing", async () => {
  const refused = [
    [{ ...article, status: "draft" }, /not published/],
    [{ ...article, bodyEn: [] }, /missing a body/],
    [{ ...article, id: "../../tmp/rae-sync-escape" }, /unsafe article id/],
  ];
  for (const [payload, reason] of refused) {
    const out = tempDir();
    try {
      await withExport({ articles: [payload] }, {}, async (api) => {
        const run = await sync(api, out);
        assert.notEqual(run.code, 0, `must exit non-zero: ${reason}`);
        assert.match(run.output, reason);
      });
      assert.deepEqual(readdirSync(out), [], "a refused export must not write a file");
      // The gate runs before the id is ever used, so it cannot become a directory name.
      assert.equal(existsSync(join(tmpdir(), "rae-sync-escape")), false);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }
});

test("running the sync twice with the same export changes nothing the second time", async () => {
  const out = tempDir();
  const images = { [article.media[0].url]: Buffer.from("<jpeg bytes>") };
  try {
    await withExport({ articles: [article] }, images, async (api) => {
      const first = await sync(api, out);
      assert.equal(first.code, 0, first.output);
      const after = snapshot(out);
      assert.ok(after["index.json"], "the data file is written");
      assert.equal(JSON.parse(readFileSync(join(out, "index.json"), "utf8")).articles[0].id, article.id);

      const second = await sync(api, out);
      assert.equal(second.code, 0, second.output);
      assert.match(second.output, /nothing to commit/);
      assert.deepEqual(snapshot(out), after, "an unchanged export must not touch a single file");
    });
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// The card is the shared `NewsImage`, so the files it names have to exist: the 900px copy plus
// the two widths its srcset derives. Only meaningful where the host has a resize CLI.
const resizer = ["magick", "convert", "ffmpeg"].find((cmd) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0) ?? null;

test("an upload becomes a webp with the two card widths", { skip: resizer ? false : "no image CLI on this host" }, async () => {
  const work = tempDir();
  const out = tempDir();
  const source = join(work, "upload.png");
  const made =
    resizer === "ffmpeg"
      ? spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1600x1000", "-frames:v", "1", source])
      : spawnSync(resizer, ["-size", "1600x1000", "gradient:red-blue", source]);
  assert.equal(made.status, 0, "the test needs a real image to resize");
  try {
    const media = { ...article.media[0], url: "/v1/media/testing-sync-20261028/01-a1b2c3d4.png" };
    await withExport({ articles: [{ ...article, media: [media] }] }, { [media.url]: readFileSync(source) }, async (api) => {
      const run = await sync(api, out);
      assert.equal(run.code, 0, run.output);

      const dir = join(out, article.id);
      assert.deepEqual(readdirSync(dir).sort(), ["01-a1b2c3d4-320.webp", "01-a1b2c3d4-640.webp", "01-a1b2c3d4.webp"]);
      const size = (name) => statSync(join(dir, name)).size;
      assert.ok(size("01-a1b2c3d4-320.webp") < size("01-a1b2c3d4.webp"), "the card widths must be smaller");
      assert.equal(JSON.parse(readFileSync(join(out, "index.json"), "utf8")).articles[0].media[0].url, `/cms-published/${article.id}/01-a1b2c3d4.webp`);
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});
