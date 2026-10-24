export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-600">
        RAE Digital Platform
      </h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        พื้นที่ทำงานเริ่มต้น (Phase 1: public website) — ยังไม่มีเนื้อหาหน้าเว็บ
      </p>
      <dl className="grid gap-2 text-sm text-neutral-500">
        <div className="flex gap-2">
          <dt className="font-medium">Stack</dt>
          <dd>Next.js · TypeScript · Tailwind CSS</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">Design baseline</dt>
          <dd>Google Stitch — Landing V2 (อนุมัติ 2026-10-24)</dd>
        </div>
      </dl>
    </main>
  );
}
