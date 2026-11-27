import type { PublicDepartment } from "@/lib/cms/departments-live";
import type { Locale } from "@/lib/i18n";

// M13: the organisation tree published through the CMS. Renders nothing while no unit is published.
const TITLE = { th: "หน่วยงานภายใน (เผยแพร่ผ่านระบบ CMS)", en: "Units and sections (from the CMS)" } as const;

function Branch({ parent, all, locale }: { parent: string | null; all: PublicDepartment[]; locale: Locale }) {
  const kids = all.filter((d) => d.parentCode === parent);
  if (kids.length === 0) return null;
  return (
    <ul className={parent === null ? "grid gap-3" : "mt-2 grid gap-2 border-l border-neutral-300 pl-4"}>
      {kids.map((d) => (
        <li id={`dp-${d.code}`} key={d.code}>
          <p className="font-medium text-neutral-800">{locale === "th" ? d.nameTh : d.nameEn}</p>
          {(locale === "th" ? d.descriptionTh : d.descriptionEn) ? <p className="text-sm text-neutral-700">{locale === "th" ? d.descriptionTh : d.descriptionEn}</p> : null}
          <Branch all={all} locale={locale} parent={d.code} />
        </li>
      ))}
    </ul>
  );
}

export function OrgStructure({ departments, locale }: { departments: PublicDepartment[]; locale: Locale }) {
  if (departments.length === 0) return null;
  return (
    <section aria-labelledby="org-structure-heading" className="bg-surface-50 py-12" id="org-structure">
      <div className="mx-auto w-full max-w-4xl px-4">
        <h2 className="text-2xl font-bold text-neutral-800" id="org-structure-heading">{TITLE[locale]}</h2>
        <div className="mt-4"><Branch all={departments} locale={locale} parent={null} /></div>
      </div>
    </section>
  );
}
