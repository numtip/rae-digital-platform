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
      };
    });
}
