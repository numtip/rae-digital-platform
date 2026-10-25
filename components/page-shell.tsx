// Shared shell for the interior content pages, so five pages do not each carry
// their own copy of the hero band, the card style and the source line.

export const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm";

export function PageHero({ title, lead }: { title: string; lead: string }) {
  return (
    <section className="bg-brand-700 py-16 text-white">
      <div className="mx-auto w-full max-w-7xl px-4">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-lg text-neutral-100">{lead}</p>
      </div>
    </section>
  );
}

// Every content page states where its text came from — nothing here is invented,
// so the reader can always check the original page.
export function SourceLine({ label, url, retrieved }: { label: string; url: string; retrieved: string }) {
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  return (
    <p className="border-t border-neutral-200 pt-4 text-sm text-neutral-600">
      {label}:{" "}
      <a className="underline" href={url} rel="noreferrer noopener" target="_blank">
        {host}
      </a>{" "}
      — {retrieved}
    </p>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      className="inline-block rounded-md bg-brand-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
      href={href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {children}
    </a>
  );
}
