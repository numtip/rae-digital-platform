import { existsSync } from "node:fs";
import { join } from "node:path";

// Where `scripts/cms-preview.mjs --site-data` writes the published articles it fetched from the
// CMS runtime. Laptop-only and git-ignored: editorial copy must never arrive on a public host by
// being present in a working tree.
export const PREVIEW_DATA_DIR = join("public", "cms-published");

// A build that ships publicly refuses to run at all while that folder exists. Refusing beats
// ignoring: an exported site that quietly lacks the article someone just published is its own
// kind of wrong answer, and a build that stops names the cause. `next dev` (NODE_ENV=development)
// is untouched, which is exactly how the data is reviewed.
export function assertNoPreviewDataOnBuild(
  dir = join(process.cwd(), PREVIEW_DATA_DIR),
  isProduction = process.env.NODE_ENV === "production",
) {
  if (!isProduction || !existsSync(dir)) return;
  throw new Error(
    `refusing a production build: ${dir} is local CMS preview data. Delete it (it is git-ignored) or run next dev to review it.`,
  );
}
