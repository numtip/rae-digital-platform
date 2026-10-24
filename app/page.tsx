export default function Home() {
  return (
    <main>
      <section className="relative flex h-[600px] items-center bg-brand-700">
        {/* TODO(issue #2): real RAE hero photo. The reference photo is a Google
            hotlink (forbidden), so the backdrop is the brand token until the
            owner supplies the asset. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-brand-700/90 via-brand-700/60 to-transparent"
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4">
          <div className="text-white">
            <h2 className="mb-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl lg:max-w-4xl lg:text-6xl">
              สร้างองค์ความรู้ สู่นวัตกรรมเกษตร
              <br />
              <span className="text-gold-500">เพื่อชุมชน และสังคมที่ยั่งยืน</span>
            </h2>
            <p className="mb-8 max-w-2xl text-lg text-neutral-200 md:text-xl">
              มุ่งมั่นด้านการวิจัย ส่งเสริมวิชาการ และบริการวิชาการด้านการเกษตร
              เพื่อพัฒนาเศรษฐกิจ สังคม และสิ่งแวดล้อมอย่างยั่งยืน
            </p>
            {/* TODO(issue #2): both CTAs land in the next slices (/about, /services).
                Disabled <button>s speak the truth to screen readers; no dead anchors. */}
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
                className="rounded-md bg-gold-500 px-8 py-3 font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
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
