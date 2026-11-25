import { closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SAFE_ID } from "./media.ts";

// A withdrawn story must not come back. The CMS is the only authority on what is published, but
// when it cannot be reached the site falls back to the last committed copy — and that copy still
// holds the article someone removed. So the publish hook records the ids it was told about here, on
// disk, and everything that reads the committed copy filters them out: list, detail, media proxy
// and sitemap, whether or not the API is answering.
//
// The file, not this process's memory, is what makes a tombstone outlive the API being down: the
// outage can be longer than the process. It is re-read whenever its mtime changes, so a second
// worker's write is picked up without a restart.
//
// The CMS generates a new id per article, so a withdrawal is final: re-publishing the same id means
// editing the file. Deleting the file un-withdraws everything in it.

const filePath = () =>
  join(process.env.RAE_CMS_DATA_DIR ?? join(process.cwd(), ".cms-data"), "withdrawn.json");

let cache: { file: string; mtimeMs: number; ids: Set<string> } | null = null;

const mtimeOf = (file: string) => {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
};

// Only ids this project's own routes can serve: a hand-edited or truncated file must never smuggle
// anything else into a comparison, and must never silently empty itself either.
function read(file: string): Set<string> {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // Unreadable, not "nothing withdrawn": keep the last good list rather than resurrect a story.
    return cache?.file === file ? cache.ids : new Set();
  }
  return new Set(
    Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && SAFE_ID.test(id)) : [],
  );
}

/** The ids the publish hook has reported withdrawn. */
export function withdrawnIds(): Set<string> {
  const file = filePath();
  const mtimeMs = mtimeOf(file);
  // Keyed by path as well as mtime: a second store (a test's temp dir, a redeploy) must not be
  // answered from the previous one's cache.
  if (!cache || cache.file !== file || cache.mtimeMs !== mtimeMs) cache = { file, mtimeMs, ids: read(file) };
  return cache.ids;
}

export const isWithdrawn = (nid: string): boolean => withdrawnIds().has(nid);

const LOCK_WAIT_MS = 5000;
const LOCK_STALE_MS = 10000;
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// An exclusive lock file ("wx" fails if it exists) serialises the read-merge-rename across
// processes. A lock older than LOCK_STALE_MS belongs to a crashed holder and is taken over.
function withLock<T>(file: string, run: () => T): T {
  const lock = `${file}.lock`;
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = Date.now() - mtimeOf(lock);
      if (mtimeOf(lock) !== 0 && age > LOCK_STALE_MS) {
        try {
          unlinkSync(lock);
        } catch {
          // another waiter took it over first; loop and try again
        }
        continue;
      }
      if (Date.now() > deadline) throw new Error("withdrawn list is locked by another process");
      sleep(20);
    }
  }
  try {
    return run();
  } finally {
    try {
      unlinkSync(lock);
    } catch {
      // already taken over as stale
    }
  }
}

/** Persist a batch, recording how many ids were not already on the list. Throws if unwritable. */
export function rememberWithdrawn(ids: string[]): number {
  const wanted = [...new Set(ids.filter((id) => SAFE_ID.test(id)))];
  if (wanted.length === 0) return 0;
  const file = filePath();
  mkdirSync(dirname(file), { recursive: true });
  return withLock(file, () => {
    // Read inside the lock and from disk, not the cache: another process may have written since.
    cache = null;
    const current = withdrawnIds();
    const fresh = wanted.filter((id) => !current.has(id));
    if (fresh.length === 0) return 0;
    // Write-then-rename: a crash mid-write must not leave a truncated file, because an empty list is
    // the one value that would let a withdrawn story back.
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify([...current, ...fresh].sort(), null, 2)}
`);
    renameSync(tmp, file);
    cache = null;
    return fresh.length;
  });
}
