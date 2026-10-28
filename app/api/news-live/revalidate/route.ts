import { revalidatePath, revalidateTag } from "next/cache";
import { NEWS_TAG, revalidateAuthorized } from "@/lib/cms/live";

// The publish hook. The CMS calls this after it publishes a story; the paths below are dropped so
// the next request renders the new set instead of waiting out `revalidate`. `x-revalidate-secret`
// must equal RAE_REVALIDATE_SECRET — no secret configured means nobody passes.
//
// Nothing here names an id: the runtime does not say which story it just published, and
// revalidating the route patterns covers every id, both locales and the sitemap in one call.

// No GET here, so the Pages build has nothing to render; only a server can post to it.

export async function POST(request: Request) {
  if (!revalidateAuthorized(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  revalidatePath("/[locale]/news-live", "page");
  revalidatePath("/[locale]/news-live/[nid]", "page");
  revalidatePath("/news-live-sitemap.xml");
  // The cached CMS read itself, so the next render asks the runtime again instead of reusing the
  // export that was current when this entry was written.
  revalidateTag(NEWS_TAG, "max");
  return Response.json({ revalidated: true });
}
