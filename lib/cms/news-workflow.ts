import { requirePermission, type RoleName } from "./permissions.ts";

export type NewsStatus = "draft" | "review" | "approved" | "published";

export type NewsRecord = {
  id: string;
  status: NewsStatus;
  pinned: boolean;
  authorId: string;
  reviewerId?: string;
  publisherId?: string;
  titleTh: string;
  titleEn: string;
  source: string;
};

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

function next(article: NewsRecord, patch: Partial<NewsRecord>): NewsRecord {
  return { ...article, ...patch };
}

export function submitForReview(article: NewsRecord, actor: { id: string; role: RoleName }): NewsRecord {
  requirePermission(actor.role, "news:review");
  if (article.status !== "draft") throw new WorkflowError("only a draft can be submitted");
  if (!article.titleTh.trim() || !article.titleEn.trim() || !article.source.trim()) {
    throw new WorkflowError("bilingual title and a source are required");
  }
  return next(article, { status: "review" });
}

export function approveNews(article: NewsRecord, actor: { id: string; role: RoleName }): NewsRecord {
  requirePermission(actor.role, "news:review");
  if (article.status !== "review") throw new WorkflowError("only a review item can be approved");
  if (actor.id === article.authorId) throw new WorkflowError("the author cannot approve their own item");
  return next(article, { status: "approved", reviewerId: actor.id });
}

export function publishNews(article: NewsRecord, actor: { id: string; role: RoleName }): NewsRecord {
  requirePermission(actor.role, "news:publish");
  if (article.status !== "approved") throw new WorkflowError("only an approved item can be published");
  if (!article.reviewerId) throw new WorkflowError("approval is missing");
  if (article.pinned && (actor.id === article.authorId || actor.id === article.reviewerId)) {
    throw new WorkflowError("a pinned item needs a second person to publish");
  }
  return next(article, { status: "published", publisherId: actor.id });
}
