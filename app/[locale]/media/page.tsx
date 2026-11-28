import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, PageHero } from "@/components/page-shell";
import { asset } from "@/lib/assets";
import { galleryVisible, mediaGallery, readPublicMedia } from "@/lib/cms/media-live";
import { getContent, getMedia, isLocale } from "@/lib/i18n";

// Media library (M15). The office uploads an image once, describes it in both languages and a publisher
// releases it; only released assets are read here. Nothing on this page is written by the site — the title,
// alternative text and caption are the library's own fields. While the library holds nothing released there
// is no page at all (404), which is also why it is not a fixed entry in PAGES.
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getMedia(locale);
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    // An empty library is a 404 — say so to a crawler that asks first.
    robots: galleryVisible(mediaGallery(await readPublicMedia(), locale)) ? undefined : { index: false, follow: true },
    alternates: {
      canonical: `/${locale}/media/`,
      languages: { th: "/th/media/", en: "/en/media/", "x-default": "/th/media/" },
    },
  };
}

export default async function Media({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getMedia(locale);
  const gallery = mediaGallery(await readPublicMedia(), locale);
  if (!galleryVisible(gallery)) notFound();

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={copy.hero.title} lead={copy.hero.lead} />
      <section className="bg-surface-50 py-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[{ label: getContent(locale).nav.home, href: `/${locale}` }, { label: copy.hero.title }]}
          />
        </div>
      </section>
      <section className="bg-white py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((photo) => (
            <figure className="rounded-lg border border-neutral-200 bg-white p-4" id={`md-${photo.code}`} key={photo.code}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the library keeps one file per asset; next/image cannot emit a srcset with images.unoptimized */}
              <img
                alt={photo.alt}
                className="aspect-[4/3] w-full rounded-md object-cover"
                decoding="async"
                loading="lazy"
                src={asset(photo.src)}
              />
              <figcaption className="mt-3">
                <h2 className="text-lg font-semibold text-neutral-800">{photo.title}</h2>
                {photo.caption ? <p className="mt-1 text-sm text-neutral-700">{photo.caption}</p> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
