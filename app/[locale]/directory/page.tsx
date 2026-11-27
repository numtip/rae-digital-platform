import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectorAndServices, MediaCards, SystemsGrid, UnitCards } from "@/components/legacy-modules";
import { Breadcrumb, PageHero, SourceLine } from "@/components/page-shell";
import { getContent, getDirectory, isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const directory = getDirectory(locale);
  return {
    title: directory.meta.title,
    description: directory.meta.description,
    alternates: {
      canonical: `/${locale}/directory/`,
      languages: { th: "/th/directory/", en: "/en/directory/", "x-default": "/th/directory/" },
    },
  };
}

export default async function Directory({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const directory = getDirectory(locale);
  const site = getContent(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={directory.hero.title} lead={directory.hero.lead} />
      <SystemsGrid copy={directory} moreHref={`/${locale}/directory/`} />
      <UnitCards copy={directory} />
      <MediaCards copy={directory} />
      <DirectorAndServices copy={directory} />
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: site.nav.home, href: `/${locale}` },
              { label: directory.hero.title },
            ]}
          />
          <SourceLine
            label={directory.source.page}
            retrieved={directory.source.retrieved}
            url="https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH"
          />
        </div>
      </section>
    </main>
  );
}
