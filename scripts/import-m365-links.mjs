#!/usr/bin/env node
// Import of EXISTING Microsoft 365 document links into the M03 registry (ADR-0004: links only).
//
//   node scripts/import-m365-links.mjs <input.csv|input.json> [--apply]
//
// Input rows: category, titleTh, titleEn, storageUrl [, version, note]   (CSV with a header row, or a JSON array).
// Default is a DRY RUN that prints a review report and writes nothing. With --apply every NEW row is registered
// as a DRAFT through the CMS API (RAE_CMS_API + RAE_IMPORT_USER / RAE_IMPORT_PASSWORD, an account with
// document:register); a person reviews the drafts and a publisher takes them live. Nothing is ever published here.
//
// Deduplication is by the file's canonical identity (host + path, query and fragment dropped, case and
// percent-encoding normalised), against rows already in the registry and against earlier rows of the same file.
import { readFileSync } from "node:fs";
import { assertSharePointFileUrl } from "../lib/cms/documents.ts";
import { DOCUMENT_CATEGORIES } from "../lib/cms/document-registry.ts";

export function canonicalLink(value) {
  const url = assertSharePointFileUrl(value);
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep the raw path */
  }
  return `${url.hostname.toLowerCase()}${path.replace(/\/$/, "").toLowerCase()}`;
}

function parseCsvLine(line) {
  const out = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') (cell += '"'), (i += 1);
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") (out.push(cell), (cell = ""));
    else cell += ch;
  }
  out.push(cell);
  return out.map((c) => c.trim());
}

export function readRows(text, name) {
  if (name.endsWith(".json")) return JSON.parse(text);
  const [header, ...lines] = text.split(/\r?\n/).filter((l) => l.trim());
  const keys = parseCsvLine(header);
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((v, i) => [keys[i], v])));
}

/** Pure review: classifies every row as new / duplicate (of the registry or of an earlier row) / invalid. */
export function reviewRows(rows, existingUrls = []) {
  const seen = new Map(existingUrls.flatMap((u) => { try { return [[canonicalLink(u), "registry"]]; } catch { return []; } }));
  const report = { new: [], duplicate: [], invalid: [] };
  rows.forEach((row, index) => {
    const line = index + 2;
    try {
      if (!(DOCUMENT_CATEGORIES).includes(row.category)) throw new Error(`unknown category "${row.category}"`);
      if (!row.titleTh?.trim() || !row.titleEn?.trim()) throw new Error("both titles are required");
      const key = canonicalLink(row.storageUrl);
      if (seen.has(key)) return report.duplicate.push({ line, titleEn: row.titleEn, of: seen.get(key) });
      seen.set(key, `row ${line}`);
      report.new.push({ line, ...row, version: row.version || "1.0" });
    } catch (error) {
      report.invalid.push({ line, reason: error.message, titleEn: row.titleEn ?? "" });
    }
  });
  return report;
}

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error("usage: import-m365-links.mjs <input.csv|input.json> [--apply]");
  const base = (process.env.RAE_CMS_API ?? "http://127.0.0.1:3317").replace(/\/$/, "");
  const login = async () => {
    const r = await fetch(`${base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: process.env.RAE_IMPORT_USER, password: process.env.RAE_IMPORT_PASSWORD }) });
    if (!r.ok) throw new Error("import login failed");
    return (await r.json()).token;
  };
  const rows = readRows(readFileSync(file, "utf8"), file);
  let existing = [];
  let token = "";
  if (process.env.RAE_IMPORT_USER) {
    token = await login();
    existing = (await (await fetch(`${base}/v1/documents`, { headers: { authorization: `Bearer ${token}` } })).json()).documents.map((d) => d.storageUrl);
  }
  const report = reviewRows(rows, existing);
  console.log(`rows ${rows.length}: new ${report.new.length}, duplicate ${report.duplicate.length}, invalid ${report.invalid.length}${token ? "" : "  (registry not consulted: set RAE_IMPORT_USER/PASSWORD)"}`);
  for (const d of report.duplicate) console.log(`  duplicate line ${d.line} (${d.titleEn}) of ${d.of}`);
  for (const i of report.invalid) console.log(`  invalid   line ${i.line} (${i.titleEn}): ${i.reason}`);
  if (flag !== "--apply") return console.log("dry run: nothing written. Re-run with --apply to register the new rows as DRAFTS.");
  if (!token) throw new Error("--apply needs RAE_IMPORT_USER and RAE_IMPORT_PASSWORD");
  let created = 0;
  for (const row of report.new) {
    const r = await fetch(`${base}/v1/documents`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ category: row.category, titleTh: row.titleTh, titleEn: row.titleEn, storageUrl: row.storageUrl, version: row.version, note: row.note ?? "", status: "draft" }) });
    if (r.status === 201) created += 1;
    else console.log(`  line ${row.line} refused: ${r.status}`);
  }
  console.log(`registered ${created} draft(s); review them in the desk, then a publisher sets them current.`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main().catch((e) => (console.error(e.message), process.exit(1)));
