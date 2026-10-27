import { requirePermission, type RoleName } from "./permissions.ts";
import { assertBilingual } from "./validation.ts";

export type NewsStatus = "draft" | "review" | "approved" | "published";

export type NewsRecord = {
  id: string;
  status: NewsStatus;
  pinned: boolean;
  authorId: string;
  reviewerId?: string;
  publisherId?: string;
  /** Set when a reviewer sends the item back; cleared on the next submission. */
  revisionReason?: string;
  returnedBy?: string;
  titleTh: string;
  titleEn: string;
  source: string;
  /** Paragraphs, as published. Thai is the source of truth; English is a faithful translation. */
  bodyTh?: string[];
  bodyEn?: string[];
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
  // The author hands their own draft to a reviewer; that is drafting, not reviewing, so it
  // needs news:draft. Anyone submitting on someone else's behalf needs news:review.
  requirePermission(actor.role, actor.id === article.authorId ? "news:draft" : "news:review");
  if (article.status !== "draft") throw new WorkflowError("only a draft can be submitted");
  try {
    assertBilingual(article);
  } catch {
    throw new WorkflowError("bilingual title and an https source are required");
  }
  // The reason a reviewer asked for changes is cleared once the author resubmits.
  return next(article, { status: "review", revisionReason: undefined, returnedBy: undefined });
}

export function returnForRevision(
  article: NewsRecord,
  actor: { id: string; role: RoleName },
  reason: string,
): NewsRecord {
  requirePermission(actor.role, "news:review");
  if (article.status !== "review" && article.status !== "approved") {
    throw new WorkflowError("only a submitted or approved item can be returned");
  }
  const trimmed = String(reason ?? "").trim();
  if (!trimmed) throw new WorkflowError("a reason is required to return an item");
  // Back to draft: the author edits and resubmits, and any earlier approval is void.
  return next(article, {
    status: "draft",
    revisionReason: trimmed,
    returnedBy: actor.id,
    reviewerId: undefined,
    publisherId: undefined,
  });
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
  // Approved publishing policy: an approval only counts when a different person gave it, so a
  // publisher may release their own draft but never on their own say-so.
  if (article.reviewerId === article.authorId) {
    throw new WorkflowError("the approval must come from someone other than the author");
  }
  // A pinned item keeps three distinct participants: author, reviewer and publisher.
  if (article.pinned) {
    if (actor.id === article.authorId) throw new WorkflowError("a pinned item needs a publisher who is not the author");
    if (actor.id === article.reviewerId) throw new WorkflowError("a pinned item needs a publisher who is not the reviewer");
  }
  return next(article, { status: "published", publisherId: actor.id });
}
