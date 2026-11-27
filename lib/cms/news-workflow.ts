import { requirePermission, type RoleName } from "./permissions.ts";
import { assertBilingual } from "./validation.ts";

export type NewsStatus = "draft" | "review" | "approved" | "published" | "revision" | "withdrawn";

/** One article as the export carried it at its last publication; the id stays the row's own. */
export type PublishedSnapshot = {
  titleTh: string;
  titleEn: string;
  source: string;
  bodyTh: string[];
  bodyEn: string[];
  publishedAt: string | null;
};

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
  /** Set once, when the item transitions to published (ISO 8601). Never derived from an export. */
  publishedAt?: string;
  /** Set when a published item is taken down; a withdrawn item is out of the export for good. */
  withdrawnAt?: string;
  withdrawnBy?: string;
  withdrawalReason?: string;
  /** 1 at the first publication and +1 at every republication; a return never resets it. */
  revisionNo?: number;
  /** The last published state, still exported while the item is being revised. */
  publishedSnapshot?: PublishedSnapshot;
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
  // A revision is submitted the same way a draft is: it has to be checked before it replaces
  // what is already live.
  if (article.status !== "draft" && article.status !== "revision") {
    throw new WorkflowError("only a draft or a revision can be submitted");
  }
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
  return next(article, {
    status: "published",
    publisherId: actor.id,
    publishedAt: new Date().toISOString(),
    // The number of publications behind this row: 1 at the first release, one more each time a
    // revision replaces it. Only this transition may touch it.
    revisionNo: (article.revisionNo ?? 0) + 1,
  });
}

/**
 * Takes a published item down. Nothing is deleted: the row keeps the body it was published with,
 * the export stops serving it, and the reason stays with the record.
 */
export function unpublishNews(
  article: NewsRecord,
  actor: { id: string; role: RoleName },
  reason: string,
): NewsRecord {
  requirePermission(actor.role, "news:publish");
  if (article.status !== "published") throw new WorkflowError("only a published item can be withdrawn");
  const trimmed = String(reason ?? "").trim();
  if (!trimmed) throw new WorkflowError("a reason is required to withdraw an item");
  return next(article, {
    status: "withdrawn",
    withdrawnAt: new Date().toISOString(),
    withdrawnBy: actor.id,
    withdrawalReason: trimmed,
  });
}

/**
 * Opens a revision of a published item without taking it down: the row becomes editable while
 * the export keeps serving the last published state. The revision then walks review and
 * approval again — an earlier sign-off does not carry over to text nobody has read.
 */
export function revisePublished(article: NewsRecord, actor: { id: string; role: RoleName }): NewsRecord {
  // Editing your own item is drafting; opening a revision on someone else's needs review rights.
  requirePermission(actor.role, actor.id === article.authorId ? "news:draft" : "news:review");
  if (article.status !== "published") throw new WorkflowError("only a published item can be revised");
  return next(article, { status: "revision", reviewerId: undefined, publisherId: undefined });
}
