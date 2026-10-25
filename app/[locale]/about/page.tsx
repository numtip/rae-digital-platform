import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { asset } from "@/lib/assets";
import { Breadcrumb } from "@/components/page-shell";
import { SITE_URL, getAbout, getContent, isLocale } from "@/lib/i18n";

// Nothing here is invented: every string comes from content/<locale>/about.ts,
// transcribed from the official office page (see the source line in the file).

const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const about = getAbout(locale);
  return {
    title: about.meta.title,
    description: about.meta.description,
    alternates: {
      canonical: `/${locale}/about/`,
      languages: {
        th: "/th/about/",
        en: "/en/about/",
        "x-default": "/th/about/",
      },
    },
  };
}

export default async function About({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const about = getAbout(locale);
  const sourceLabel = about.source.label;

  return (
    <main id="main-content" tabIndex={-1}>
      <section className="bg-brand-700 py-16 text-white">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-6">
            <Image
              src={asset("/images/about/rae-logo.png")}
              alt={about.images.logo.alt}
              width={96}
              height={89}
              className="h-16 w-auto rounded bg-white/10 p-2"
              priority
            />
            <div>
              <h1 className="text-3xl font-bold leading-tight md:text-4xl">{about.hero.title}</h1>
              <p className="mt-3 max-w-3xl text-lg text-neutral-100">{about.hero.lead}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: about.hero.title },
            ]}
          />
        </div>
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 md:grid-cols-3">
          <div className={CARD}>
            <h2 className="text-xl font-bold text-brand-600">{about.philosophy.title}</h2>
            <p className="mt-3 text-neutral-700">{about.philosophy.text}</p>
          </div>
          <div className={CARD}>
            <h2 className="text-xl font-bold text-brand-600">{about.vision.title}</h2>
            <p className="mt-3 text-neutral-700">{about.vision.text}</p>
          </div>
          <div className={CARD}>
            <h2 className="text-xl font-bold text-brand-600">{about.mission.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-700">
              {about.mission.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h2 className="text-2xl font-bold text-neutral-800 md:text-3xl">{about.history.title}</h2>
          <ol className="mt-10 space-y-6 border-l-2 border-brand-500/30 pl-6">
            {about.history.items.map((entry) => (
              <li key={entry.year} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full bg-brand-500"
                />
                <p className="text-sm font-semibold text-gold-600">{entry.year}</p>
                <h3 className="mt-1 text-lg font-semibold text-neutral-800">{entry.title}</h3>
                <p className="mt-1 max-w-3xl text-neutral-700">{entry.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-cream-50 py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 md:grid-cols-2">
          <div className="space-y-4">
            {/* Two official photographs of the office buildings. Alt text is
                translated, never left in one language. */}
            <Image
              src={asset("/images/about/office-building.webp")}
              alt={about.images.building.alt}
              width={1200}
              height={557}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="w-full rounded-lg object-cover shadow-sm"
            />
            <Image
              src={asset("/images/about/office-annex.webp")}
              alt={about.images.annex.alt}
              width={719}
              height={505}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="w-full rounded-lg object-cover shadow-sm"
            />
          </div>
          <div className={CARD}>
            <h2 className="text-2xl font-bold text-neutral-800">{about.contact.title}</h2>
            <dl className="mt-6 space-y-4 text-neutral-700">
              <div>
                <dt className="font-semibold">{about.contact.addressLabel}</dt>
                <dd className="mt-1">
                  {about.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{about.contact.phoneLabel}</dt>
                <dd className="mt-1">
                  <a className="text-brand-600 underline" href={`tel:${about.contact.phone.replace(/[^\d+]/g, "")}`}>
                    {about.contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{about.contact.emailLabel}</dt>
                <dd className="mt-1 space-y-1">
                  {about.contact.emails.map((email) => (
                    <a key={email} className="block text-brand-600 underline" href={`mailto:${email}`}>
                      {email}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="mt-8 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
              {sourceLabel}:{" "}
              <a className="underline" href={about.source.url} rel="noreferrer noopener" target="_blank">
                rae.mju.ac.th
              </a>{" "}
              — {about.source.retrieved}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{SITE_URL.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
