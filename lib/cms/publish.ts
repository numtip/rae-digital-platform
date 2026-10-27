import type { NewsRecord } from "./news-workflow.ts";
import { assertBilingual } from "./validation.ts";

export function publishedArticlesForExport(articles: NewsRecord[]) {
  return articles
    .filter((article) => article.status === "published")
    .map((article) => {
      assertBilingual(article);
      return {
        id: article.id,
        titleTh: article.titleTh,
        titleEn: article.titleEn,
        source: article.source,
        // The export is what a static import would read, so it carries the story, not just a
        // headline. Media references are added by the runtime, which owns the file layer.
        bodyTh: article.bodyTh ?? [],
        bodyEn: article.bodyEn ?? [],
      };
    });
}
