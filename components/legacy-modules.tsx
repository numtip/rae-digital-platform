import Link from "next/link";
import { featuredSystems, linksByGroup, type LinkGroup, type RegistryLink } from "@/content/links";
import type { DirectoryContent } from "@/content/th/directory";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
const TILE =
  `flex min-h-11 items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm font-medium text-neutral-800 hover:border-brand-500 ${FOCUS}`;

function Icon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <title>{id}</title>
    </svg>
  );
}

function labelOf(copy: DirectoryContent, id: string): string {
  return copy.labels[id as keyof DirectoryContent["labels"]];
}

function External({ link, label }: { link: RegistryLink; label: string }) {
  return (
    <a className={TILE} href={link.href} rel="noreferrer noopener" target="_blank">
      <Icon id={link.id} />
      <span>{label}</span>
    </a>
  );
}

export function SystemsGrid({
  copy,
  moreHref,
}: {
  copy: DirectoryContent;
  moreHref: string;
}) {
  return (
    <section aria-labelledby="systems" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="systems" className="text-2xl font-bold text-neutral-800 md:text-3xl">
              {copy.systems.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{copy.systems.subtitle}</p>
          </div>
          <Link className={`min-h-11 text-sm font-medium text-brand-600 underline underline-offset-2 ${FOCUS}`} href={moreHref}>
            {copy.systems.more}
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredSystems().map((link) => (
            <li key={link.id}>
              <External label={labelOf(copy, link.id)} link={link} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function UnitCards({ copy }: { copy: DirectoryContent }) {
  return (
    <section aria-labelledby="units" className="bg-surface-50 py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="units" className="text-2xl font-bold text-neutral-800 md:text-3xl">
          {copy.units.title}
        </h2>
        <p className="mt-1 mb-8 text-sm text-neutral-600">{copy.units.subtitle}</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {linksByGroup("units").map((link) => (
            <li key={link.id}>
              <External label={labelOf(copy, link.id)} link={link} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MediaCards({ copy }: { copy: DirectoryContent }) {
  return (
    <section aria-labelledby="media" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="media" className="text-2xl font-bold text-neutral-800 md:text-3xl">
          {copy.media.title}
        </h2>
        <p className="mt-1 mb-8 text-sm text-neutral-600">{copy.media.subtitle}</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {linksByGroup("media").map((link) => (
            <li key={link.id}>
              <External label={labelOf(copy, link.id)} link={link} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function serviceLinks(group: LinkGroup): RegistryLink[] {
  if (group === "rooms") return linksByGroup("systems").filter((link) => link.id === "meeting-rooms");
  if (group === "knowledge") return linksByGroup("systems").filter((link) => link.id === "knowledge-base" || link.id === "germplasm");
  if (group === "internal") return linksByGroup("systems").filter((link) => link.id === "green-office" || link.id === "face-scan");
  return linksByGroup(group);
}

const SERVICE_GROUPS: { key: "internal" | "knowledge" | "rooms" | "other"; group: LinkGroup }[] = [
  { key: "internal", group: "internal" },
  { key: "knowledge", group: "knowledge" },
  { key: "rooms", group: "rooms" },
  { key: "other", group: "other" },
];

export function DirectorAndServices({ copy }: { copy: DirectoryContent }) {
  const director = linksByGroup("director")[0];
  return (
    <section aria-labelledby="services-links" className="bg-cream-50 py-16">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-3">
        <article className="rounded-lg border border-brand-600 bg-brand-700 p-6 text-white lg:col-span-1">
          <h2 id="services-links" className="text-lg font-bold">
            {copy.director.title}
          </h2>
          <p className="mt-4 text-xl font-bold">{copy.director.name}</p>
          <p className="mt-1 text-sm text-neutral-100">{copy.director.role}</p>
          <p className="mt-4 text-sm leading-relaxed text-neutral-100">{copy.director.body}</p>
          {director && (
            <a
              className={`mt-6 inline-flex min-h-11 items-center rounded-md bg-gold-500 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-gold-600 ${FOCUS}`}
              href={director.href}
              rel="noreferrer noopener"
              target="_blank"
            >
              {copy.director.cta}
            </a>
          )}
        </article>
        <div className="lg:col-span-2">
          <h3 className="mb-4 text-xl font-bold text-neutral-800">{copy.services.title}</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {SERVICE_GROUPS.map(({ key, group }) => (
              <div key={key}>
                <h4 className="mb-2 text-sm font-bold text-brand-700">{copy.services[key]}</h4>
                <ul className="grid gap-2">
                  {serviceLinks(group).map((link) => (
                    <li key={link.id}>
                      <External label={labelOf(copy, link.id)} link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
