import Link from "next/link";

// Destinations that do not exist yet are rendered as disabled text, never as
// href="#" — an empty anchor is a dead control (issue #2 rule). Real routes are
// added here as pages land.
type NavItem = { label: string; href?: string; current?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "หน้าหลัก", href: "/", current: true },
  { label: "เกี่ยวกับเรา" },
  { label: "วิจัยและนวัตกรรม" },
  { label: "บริการวิชาการ" },
  { label: "เอกสารเผยแพร่" },
  { label: "ข่าวสารและกิจกรรม" },
];

function NavLink({ item }: { item: NavItem }) {
  const base = "text-sm font-medium leading-none";
  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        title="ยังไม่เปิดใช้งาน"
        className={`${base} cursor-not-allowed opacity-60`}
      >
        {item.label}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={item.current ? "page" : undefined}
      className={`${base} ${item.current ? "text-gold-500" : "transition-colors hover:text-gold-500"}`}
    >
      {item.label}
    </Link>
  );
}

const SearchIcon = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const MenuIcon = (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

export function SiteHeader() {
  const navLinks = NAV_ITEMS.map((item) => <NavLink key={item.label} item={item} />);

  return (
    <header className="sticky top-0 z-50 bg-brand-700 text-white shadow-md">
      <div className="border-b border-brand-600/50 py-1 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4">
          <span aria-disabled="true" title="ยังไม่เปิดใช้งาน" className="cursor-not-allowed opacity-60">
            เข้าสู่ระบบสำหรับบุคลากร
          </span>
          <span className="text-neutral-400" aria-hidden="true">|</span>
          <span aria-disabled="true" title="ยังไม่เปิดใช้งาน" className="cursor-not-allowed opacity-60">
            English
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        {/* TODO(issue #2): real RAE logo asset. The reference logo is a Google
            hotlink; until RAE supplies the file this is the text mark only. */}
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white font-bold text-brand-500"
          >
            RAE
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">RAE</h1>
            <p className="text-xs leading-tight text-neutral-300">
              สำนักวิจัยและส่งเสริมวิชาการการเกษตร
              <br />
              มหาวิทยาลัยแม่โจ้
            </p>
          </div>
        </div>

        <nav aria-label="เมนูหลัก" className="hidden items-center gap-6 lg:flex">
          {navLinks}
        </nav>

        {/* TODO(issue #2): search page not built yet — the slot is kept, the
            control is disabled so nothing looks clickable but does nothing. */}
        <div className="relative hidden md:block">
          <input
            disabled
            type="search"
            placeholder="ค้นหา..."
            aria-label="ค้นหา (ยังไม่เปิดใช้งาน)"
            className="w-48 rounded-full border-none bg-white py-1.5 pl-4 pr-10 text-sm text-neutral-800 placeholder:text-neutral-500 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {SearchIcon}
          </span>
        </div>

        <details className="lg:hidden">
          <summary className="cursor-pointer list-none p-2 [&::-webkit-details-marker]:hidden">
            <span className="sr-only">เปิดเมนูหลัก</span>
            {MenuIcon}
          </summary>
          <nav
            aria-label="เมนูหลัก (มือถือ)"
            className="absolute inset-x-0 top-full flex flex-col gap-4 bg-brand-700 px-4 py-4 shadow-lg"
          >
            {navLinks}
          </nav>
        </details>
      </div>
    </header>
  );
}
