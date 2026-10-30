import type { NewsRecord, PublishedSnapshot } from "./news-workflow.ts";
import { assertBilingual } from "./validation.ts";

/** One article as the export carries it, id included (the row's id, never a stored copy of it). */
export type ExportedArticle = PublishedSnapshot & { id: string };

function content(article: NewsRecord): PublishedSnapshot {
  assertBilingual(article);
  return {
    titleTh: article.titleTh,
    titleEn: article.titleEn,
    source: article.source,
    // The export is what a static import would read, so it carries the story, not just a headline.
    bodyTh: article.bodyTh ?? [],
    bodyEn: article.bodyEn ?? [],
    // The export is the only carrier of the publication date: a consumer that sees null
    // has to leave the date off rather than invent one.
    publishedAt: article.publishedAt ?? null,
  };
}

export function publishedView(article: NewsRecord): ExportedArticle {
  return { id: article.id, ...content(article) };
}

/** What publishing freezes on the row, so a revision can be edited while the site keeps its story. */
export function publishedSnapshotOf(article: NewsRecord): PublishedSnapshot {
  return content(article);
}

export function publishedArticlesForExport(articles: NewsRecord[]): ExportedArticle[] {
  return articles
    // Anything that has been published keeps a live version — its snapshot — through every state
    // of a revision: revision, review, approval, even a return to draft. Only withdrawing ends it.
    .filter((article) => article.status === "published" || (article.status !== "withdrawn" && article.publishedSnapshot))
    .map((article) =>
      article.status !== "published" && article.publishedSnapshot
        ? { id: article.id, ...article.publishedSnapshot }
        : publishedView(article),
    );
}
