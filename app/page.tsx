export default function Home() {
  return (
    <main>
      {/* TODO(issue #2): real RAE hero photo + the dark scrim that sits over it.
          The reference photo is a Google hotlink (forbidden), so the hero is the
          brand token until the owner supplies the asset. */}
      <section className="flex min-h-[600px] items-center bg-brand-700">
        <div className="relative mx-auto w-full max-w-7xl px-4">
          <div className="text-white">
            <h1 className="mb-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl lg:max-w-4xl lg:text-6xl">
              สร้างองค์ความรู้ สู่นวัตกรรมเกษตร
              <br />
              <span className="text-gold-500">เพื่อชุมชน และสังคมที่ยั่งยืน</span>
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-neutral-200 md:text-xl">
              มุ่งมั่นด้านการวิจัย ส่งเสริมวิชาการ และบริการวิชาการด้านการเกษตร
              เพื่อพัฒนาเศรษฐกิจ สังคม และสิ่งแวดล้อมอย่างยั่งยืน
            </p>
            {/* TODO(issue #2): both CTAs land in the next slices (/about, /services).
                Disabled <button>s speak the truth to screen readers; no dead anchors.
                Gold keeps dark text: white on gold-500 is 2.3:1 and would fail AA. */}
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled
                title="ยังไม่เปิดใช้งาน"
                className="rounded-md bg-brand-500 px-8 py-3 font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                เกี่ยวกับเรา
              </button>
              <button
                type="button"
                disabled
                title="ยังไม่เปิดใช้งาน"
                className="rounded-md bg-gold-500 px-8 py-3 font-medium text-brand-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                บริการของเรา
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
