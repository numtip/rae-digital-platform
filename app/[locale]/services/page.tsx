import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, CARD, PageHero, SourceLine } from "@/components/page-shell";
import { getContent, getServices, isLocale } from "@/lib/i18n";

// Copy from content/<locale>/services.ts, transcribed from the official
// "กองบริหารงานบริการวิชาการ" page. The phone number is the one printed there.

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const services = getServices(locale);
  return {
    title: services.meta.title,
    description: services.meta.description,
    alternates: {
      canonical: `/${locale}/services/`,
      languages: { th: "/th/services/", en: "/en/services/", "x-default": "/th/services/" },
    },
  };
}

export default async function Services({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const services = getServices(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={services.hero.title} lead={services.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: services.hero.title },
            ]}
          />
        </div>
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 md:grid-cols-2">
          <div className={CARD}>
            <h2 className="text-2xl font-bold text-neutral-800">{services.mission.title}</h2>
            <p className="mt-3 text-neutral-700">{services.mission.text}</p>
          </div>
          <div className={CARD}>
            <h2 className="text-2xl font-bold text-neutral-800">{services.units.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-700">
              {services.units.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className={`${CARD} max-w-xl`}>
            <h2 className="text-2xl font-bold text-neutral-800">{services.contact.title}</h2>
            <dl className="mt-4 space-y-3 text-neutral-700">
              <div>
                <dt className="font-semibold">{services.contact.unit}</dt>
                <dd className="mt-1">{services.contact.works}</dd>
              </div>
              <div>
                <dt className="font-semibold">{services.contact.phoneLabel}</dt>
                <dd className="mt-1">
                  <a
                    className="text-brand-600 underline"
                    href={`tel:${services.contact.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {services.contact.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-10">
            <SourceLine {...services.source} />
          </div>
        </div>
      </section>
    </main>
  );
}
