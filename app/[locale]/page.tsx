import { notFound } from "next/navigation";
import { getContent, isLocale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { hero } = getContent(locale);

  return (
    <main>
      {/* TODO(issue #2): real RAE hero photo + the dark scrim that sits over it.
          The reference photo is a Google hotlink (forbidden), so the hero is the
          brand token until the owner supplies the asset. */}
      <section className="flex min-h-[600px] items-center bg-brand-700">
        <div className="relative mx-auto w-full max-w-7xl px-4">
          <div className="text-white">
            <h1 className="mb-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl lg:max-w-4xl lg:text-6xl">
              {hero.title}
              <br />
              <span className="text-gold-500">{hero.titleAccent}</span>
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-neutral-200 md:text-xl">{hero.description}</p>
            {/* TODO(issue #2): both CTAs land in the next slices (/about, /services).
                Disabled <button>s speak the truth to screen readers; no dead anchors.
                Gold keeps dark text: white on gold-500 is 2.3:1 and would fail AA. */}
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled
                title={getContent(locale).header.notAvailable}
                className="rounded-md bg-brand-500 px-8 py-3 font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {hero.primaryCta}
              </button>
              <button
                type="button"
                disabled
                title={getContent(locale).header.notAvailable}
                className="rounded-md bg-gold-500 px-8 py-3 font-medium text-brand-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {hero.secondaryCta}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
