import { revalidatePath, revalidateTag } from "next/cache";
import { NEWS_TAG, readWithdrawn, revalidateAuthorized } from "@/lib/cms/live";
import { rememberWithdrawn } from "@/lib/cms/withdrawn";

// The publish hook. The CMS calls this after it publishes or withdraws a story; the paths below are
// dropped so the next request renders the new set instead of waiting out `revalidate`.
// `x-revalidate-secret` must equal RAE_REVALIDATE_SECRET — no secret configured means nobody passes.
//
// The optional body `{withdrawn:[ids]}` names the stories that were taken down. Those ids are
// written to the tombstone file *before* anything is revalidated, because they are what stops the
// committed fallback copy from serving a withdrawn story while the API is down. Nothing here needs
// an id to be revalidated: the route patterns cover every id, both locales and the sitemap.
//
// No GET here, so the Pages build has nothing to render; only a server can post to it.

export async function POST(request: Request) {
  if (!revalidateAuthorized(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = readWithdrawn(await request.text());
  if (!body.ok) return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  let withdrawn = 0;
  if (body.ids.length > 0) {
    try {
      withdrawn = rememberWithdrawn(body.ids);
    } catch {
      // The CMS should retry: a withdrawal that was not written down would come back on the next
      // outage, so reporting success here would be a lie.
      return Response.json({ error: "WITHDRAWN_NOT_PERSISTED" }, { status: 500 });
    }
  }

  revalidatePath("/[locale]/news", "page");
  revalidatePath("/[locale]/news/[nid]", "page");
  revalidatePath("/[locale]/search", "page");
  revalidatePath("/sitemap.xml");
  // The cached CMS read itself, so the next render asks the runtime again instead of reusing the
  // export that was current when this entry was written.
  revalidateTag(NEWS_TAG, "max");
  return Response.json({ revalidated: true, withdrawn });
}
