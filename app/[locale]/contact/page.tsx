import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, CARD, PageHero, SourceLine } from "@/components/page-shell";
import { getAbout, getContent, isLocale } from "@/lib/i18n";

// Rendered only from copy that is already in the repo: the office's own contact
// details from content/<locale>/site.ts `footer` — none of it invented. There is no
// contact form on purpose: a form needs an SMTP target and a privacy basis, neither
// of which exists yet.

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const site = getContent(locale);
  return {
    title: `${site.nav.contact} — ${site.header.orgFull}`,
    description: `${site.footer.address} · ${site.footer.phone} · ${site.footer.email}`,
    alternates: {
      canonical: `/${locale}/contact/`,
      languages: { th: "/th/contact/", en: "/en/contact/", "x-default": "/th/contact/" },
    },
  };
}

export default async function Contact({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const site = getContent(locale);
  const about = getAbout(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={site.nav.contact} lead={about.contact.title} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Breadcrumb
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: site.nav.contact },
            ]}
          />
          <div className={CARD}>
            <dl className="space-y-6 text-neutral-700">
              <div>
                <dt className="font-semibold text-neutral-800">{about.contact.addressLabel}</dt>
                <dd className="mt-1">
                  {about.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-800">{about.contact.phoneLabel}</dt>
                <dd className="mt-1">
                  <a
                    className="text-brand-600 underline"
                    href={`tel:${about.contact.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {about.contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-800">{about.contact.emailLabel}</dt>
                <dd className="mt-1 space-y-1">
                  {about.contact.emails.map((email) => (
                    <a key={email} className="block text-brand-600 underline" href={`mailto:${email}`}>
                      {email}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-10">
            <SourceLine {...about.source} />
          </div>
        </div>
      </section>
    </main>
  );
}
