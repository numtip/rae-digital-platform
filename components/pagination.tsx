import Link from "next/link";

// Numbered pagination that works on a static host: every page is a real URL, page 1 is
// /news/ itself, and the current page is marked with aria-current rather than colour.

export function Pagination({
  locale,
  current,
  total,
  labels,
}: {
  locale: string;
  current: number;
  total: number;
  labels: { label: string; previous: string; next: string; page: (page: number, total: number) => string };
}) {
  if (total <= 1) return null;

  const href = (page: number) => (page === 1 ? `/${locale}/news` : `/${locale}/news/page/${page}`);
  const pages = Array.from({ length: total }, (_, index) => index + 1);
  const linkClass =
    "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-brand-500 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <nav aria-label={labels.label} className="mt-10">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          {current > 1 ? (
            <Link className={linkClass} href={href(current - 1)} rel="prev">
              ‹ {labels.previous}
            </Link>
          ) : (
            <span aria-disabled="true" className={`${linkClass} cursor-not-allowed opacity-50`}>
              ‹ {labels.previous}
            </span>
          )}
        </li>

        {pages.map((page) => (
          <li key={page}>
            {page === current ? (
              <span
                aria-current="page"
                className="rounded-md border border-brand-600 bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
              >
                {page}
              </span>
            ) : (
              <Link
                aria-label={labels.page(page, total)}
                className={linkClass}
                href={href(page)}
              >
                {page}
              </Link>
            )}
          </li>
        ))}

        <li>
          {current < total ? (
            <Link className={linkClass} href={href(current + 1)} rel="next">
              {labels.next} ›
            </Link>
          ) : (
            <span aria-disabled="true" className={`${linkClass} cursor-not-allowed opacity-50`}>
              {labels.next} ›
            </span>
          )}
        </li>
      </ul>
      <p className="mt-3 text-sm text-neutral-600">{labels.page(current, total)}</p>
    </nav>
  );
}
