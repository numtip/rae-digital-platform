import type { NewsRecord } from "./news-workflow.ts";

export function publishedArticlesForExport(articles: NewsRecord[]) {
  return articles
    .filter((article) => article.status === "published")
    .map((article) => {
      if (!article.source) throw new Error(`published item ${article.id} has no source`);
      return {
        id: article.id,
        titleTh: article.titleTh,
        titleEn: article.titleEn,
        source: article.source,
      };
    });
}
