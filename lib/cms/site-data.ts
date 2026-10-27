import { join } from "node:path";
import type { PreviewArticle } from "./preview-site.ts";

// Where the syndicated data lives in the repo. It is committed on purpose: the CMS runs on a
// loopback-only host no CI runner can reach, so the article has to be present before the build.
export const PUBLISHED_SITE_DIR = join("public", "cms-published");

// The one file shape both writers emit (`scripts/cms-sync.mjs`, `scripts/cms-preview.mjs
// --site-data`), and the one `published-site.ts` validates again at build time. Deliberately
// carries no timestamp: an unchanged export must produce identical bytes, or every sync would
// look like a change and open a pull request against the site.
export function siteDataFile(articles: PreviewArticle[]): string {
  const data = {
    articles: articles.map((article) => ({
      ...article,
      // The site serves the copy from its own root; the article's images are fetched again by
      // the caller and written beside it. Only the file name is kept, so the path shape stays
      // `/cms-published/<id>/<file>` and the export gate still applies.
      media: article.media.map((media) => ({
        ...media,
        url: `/cms-published/${article.id}/${media.url.split("/").pop()}`,
      })),
    })),
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}
