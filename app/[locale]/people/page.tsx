import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, PageHero } from "@/components/page-shell";
import { readPublicDepartments } from "@/lib/cms/departments-live";
import { personName, readPublicPersonnel, type PublicPerson } from "@/lib/cms/personnel-live";
import { getContent, isLocale } from "@/lib/i18n";
import { telHref } from "@/lib/phone";

// M12 people directory. Only people an officer entered, who are active, public and have a recorded consent
// (the CMS decides; this page cannot see anyone else). Work contact only. Empty -> a plain note and noindex.
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

const COPY = {
  th: { title: "ทำเนียบบุคลากร", lead: "บุคลากรของสำนักวิจัยและบริการวิชาการที่เผยแพร่ข้อมูลติดต่อในที่ทำงาน", empty: "ขณะนี้ยังไม่มีข้อมูลบุคลากรที่เผยแพร่", other: "หน่วยงานอื่น ๆ", expertise: "ความเชี่ยวชาญ", phone: "โทร", description: "ทำเนียบบุคลากร สำนักวิจัยและบริการวิชาการ มหาวิทยาลัยแม่โจ้" },
  en: { title: "Staff directory", lead: "People of the Research and Academic Service Office who publish a work contact.", empty: "No staff entries are published at the moment.", other: "Other units", expertise: "Expertise", phone: "Tel", description: "Staff directory of the Research and Academic Service Office, Maejo University" },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const people = await readPublicPersonnel();
  return {
    title: COPY[locale].title,
    description: COPY[locale].description,
    robots: people.length === 0 ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/${locale}/people/`, languages: { th: "/th/people/", en: "/en/people/", "x-default": "/th/people/" } },
  };
}

export default async function People({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = COPY[locale];
  const [people, units] = await Promise.all([readPublicPersonnel(), readPublicDepartments()]);
  const unitName = new Map(units.map((u) => [u.code, locale === "th" ? u.nameTh : u.nameEn]));
  const groups = new Map<string, PublicPerson[]>();
  for (const p of people) {
    const key = p.departmentCode && unitName.has(p.departmentCode) ? p.departmentCode : "";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={copy.title} lead={copy.lead} />
      <section className="bg-surface-50 py-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb locale={locale} trail={[{ label: getContent(locale).nav.home, href: `/${locale}` }, { label: copy.title }]} />
        </div>
      </section>
      <section className="bg-white py-12">
        <div className="mx-auto grid w-full max-w-4xl gap-10 px-4">
          {people.length === 0 ? <p className="text-neutral-700">{copy.empty}</p> : null}
          {ordered.map(([unit, list]) => (
            <div key={unit || "other"}>
              <h2 className="text-2xl font-bold text-neutral-800">{unit ? unitName.get(unit) : copy.other}</h2>
              <ul className="mt-4 grid gap-3">
                {list.map((p) => (
                  <li className="rounded-lg border border-neutral-200 bg-white p-4" id={`ps-${p.code}`} key={p.code}>
                    <h3 className="text-lg font-semibold text-neutral-800">{personName(p, locale)}</h3>
                    <p className="text-sm text-neutral-700">
                      {[locale === "th" ? p.positionTh : p.positionEn || p.positionTh, p.academicRank, p.workGroup].filter(Boolean).join(" · ")}
                    </p>
                    {p.expertise.length > 0 ? <p className="mt-1 text-sm text-neutral-700">{copy.expertise}: {p.expertise.join(", ")}</p> : null}
                    <p className="mt-1 text-sm">
                      {p.email ? <a className="text-brand-600 underline" href={`mailto:${p.email}`}>{p.email}</a> : null}
                      {p.email && p.phoneOffice ? " · " : null}
                      {p.phoneOffice ? <a className="text-brand-600 underline" href={`tel:${telHref(p.phoneOffice)}`}>{copy.phone} {p.phoneOffice}</a> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
