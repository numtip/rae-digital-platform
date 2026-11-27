"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// M12 desk. Directory fields (editors and above); publishing a person needs a publisher and the consent box;
// restricted data (national id, birth date, gender, address, LINE, Facebook, personal phone, CV) is loaded only on
// request, only for admins, and every load is audited. Enter VERIFIED data only. People are deactivated, never deleted.
const COPY = {
  th: {
    heading: "บุคลากร (Personnel)", hint: "กรอกเฉพาะข้อมูลที่ตรวจสอบแล้ว ข้อมูลส่วนบุคคลเฉพาะ (เลขบัตร ฯลฯ) เห็นได้เฉพาะผู้ดูแลระบบและทุกครั้งที่เปิดดูจะถูกบันทึกในประวัติการตรวจสอบ",
    prefix: "คำนำหน้า", firstTh: "ชื่อ (ไทย)", lastTh: "นามสกุล (ไทย)", firstEn: "ชื่อ (อังกฤษ)", lastEn: "นามสกุล (อังกฤษ)", posTh: "ตำแหน่ง (ไทย)", posEn: "ตำแหน่ง (อังกฤษ)",
    rank: "ตำแหน่งวิชาการ", level: "ระดับ", group: "กลุ่มงาน", unit: "หน่วยงาน", none: "(ไม่ระบุ)", email: "อีเมลที่ทำงาน", phone: "โทรศัพท์ที่ทำงาน", expertise: "ความเชี่ยวชาญ (คั่นด้วย ,)", empCode: "รหัสพนักงาน",
    isPublic: "เผยแพร่ในทำเนียบสาธารณะ", consent: "ได้รับความยินยอมจากเจ้าของข้อมูลแล้ว", create: "บันทึกบุคลากร", save: "บันทึกการแก้ไข", saved: "บันทึกแล้ว", empty: "ยังไม่มีบุคลากร", edit: "แก้ไข", status: "สถานะ", active: "ปฏิบัติงาน", inactive: "ไม่ปฏิบัติงาน",
    priv: "ข้อมูลส่วนบุคคล (เฉพาะผู้ดูแลระบบ)", load: "เปิดดูข้อมูลส่วนบุคคล (บันทึกในประวัติ)", nid: "เลขประจำตัวประชาชน", birth: "วันเกิด (YYYY-MM-DD)", gender: "เพศ", address: "ที่อยู่", line: "LINE", fb: "Facebook (https://…)", pphone: "โทรศัพท์ส่วนตัว", savePriv: "บันทึกข้อมูลส่วนบุคคล", denied: "ไม่มีสิทธิ์ดูข้อมูลส่วนบุคคล หรือยังไม่ได้ตั้งค่ากุญแจเข้ารหัส",
  },
  en: {
    heading: "Personnel", hint: "Enter verified data only. Restricted personal data (national id etc.) is visible to admins only and every view is written to the audit trail.",
    prefix: "Prefix", firstTh: "First name (Thai)", lastTh: "Last name (Thai)", firstEn: "First name (English)", lastEn: "Last name (English)", posTh: "Position (Thai)", posEn: "Position (English)",
    rank: "Academic rank", level: "Level", group: "Work group", unit: "Unit", none: "(none)", email: "Work email", phone: "Office phone", expertise: "Expertise (comma separated)", empCode: "Employee code",
    isPublic: "Publish in the public directory", consent: "The person's consent has been obtained", create: "Save person", save: "Save changes", saved: "Saved", empty: "No people yet", edit: "Edit", status: "Status", active: "Active", inactive: "Inactive",
    priv: "Personal data (admins only)", load: "Open personal data (audited)", nid: "National id", birth: "Birth date (YYYY-MM-DD)", gender: "Gender", address: "Address", line: "LINE", fb: "Facebook (https://…)", pphone: "Personal phone", savePriv: "Save personal data", denied: "No access to personal data, or the encryption key is not configured.",
  },
} as const;

type Ps = { code: string; employeeCode: string | null; prefixTh: string; firstTh: string; lastTh: string; firstEn: string; lastEn: string; positionTh: string; positionEn: string; academicRank: string; level: string; workGroup: string; departmentCode: string | null; email: string; phoneOffice: string; expertise: string[]; isPublic: boolean; consentAt: number | null; status: "active" | "inactive" };
type Unit = { code: string; nameTh: string; nameEn: string; status: string };
const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function PersonnelDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [people, setPeople] = useState<Ps[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [message, setMessage] = useState("");
  const call = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
      const payload = response ? await response.json().catch(() => ({})) : {};
      return { ok: !!response?.ok, status: response?.status ?? 0, payload: payload as Record<string, unknown> };
    },
    [apiBase, token],
  );
  const refresh = useCallback(async () => {
    const r = await call("/v1/personnel");
    setPeople(r.ok ? ((r.payload.personnel as Ps[]) ?? []) : null);
    const d = await call("/v1/departments");
    if (d.ok) setUnits((d.payload.departments as Unit[]) ?? []);
  }, [call]);
  useEffect(() => {
    let live = true;
    void (async () => {
      const r = await call("/v1/personnel");
      if (!live) return;
      setPeople(r.ok ? ((r.payload.personnel as Ps[]) ?? []) : null);
      const d = await call("/v1/departments");
      if (live && d.ok) setUnits((d.payload.departments as Unit[]) ?? []);
    })();
    return () => {
      live = false;
    };
  }, [call]);
  if (people === null) return null;

  const fail = (r: { payload: Record<string, unknown>; status: number }) => String(r.payload.message || r.payload.error || r.status);
  const fields = (d: FormData) => ({
    employeeCode: d.get("employeeCode") || null, prefixTh: d.get("prefixTh"), firstTh: d.get("firstTh"), lastTh: d.get("lastTh"), firstEn: d.get("firstEn"), lastEn: d.get("lastEn"),
    positionTh: d.get("positionTh"), positionEn: d.get("positionEn"), academicRank: d.get("academicRank"), level: d.get("level"), workGroup: d.get("workGroup"),
    departmentCode: d.get("departmentCode") || null, email: d.get("email"), phoneOffice: d.get("phoneOffice"),
    expertise: String(d.get("expertise") ?? "").split(",").map((s) => s.trim()).filter(Boolean), isPublic: d.get("isPublic") === "on", consent: d.get("consent") === "on",
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>, code?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = fields(new FormData(form));
    const r = code ? await call(`/v1/personnel/${code}`, "PATCH", body) : await call("/v1/personnel", "POST", body);
    setMessage(r.ok ? copy.saved : fail(r));
    if (r.ok) {
      if (!code) form.reset();
      await refresh();
    }
  }
  async function setStatus(code: string, status: string) {
    const r = await call(`/v1/personnel/${code}`, "PATCH", { status });
    setMessage(r.ok ? "" : fail(r));
    await refresh();
  }

  const unitName = (u: Unit) => (locale === "th" ? u.nameTh : u.nameEn);
  const form = (p?: Ps) => (
    <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event, p?.code)}>
      {([["prefixTh", copy.prefix, p?.prefixTh], ["employeeCode", copy.empCode, p?.employeeCode ?? ""], ["firstTh", copy.firstTh, p?.firstTh], ["lastTh", copy.lastTh, p?.lastTh], ["firstEn", copy.firstEn, p?.firstEn], ["lastEn", copy.lastEn, p?.lastEn], ["positionTh", copy.posTh, p?.positionTh], ["positionEn", copy.posEn, p?.positionEn], ["academicRank", copy.rank, p?.academicRank], ["level", copy.level, p?.level], ["workGroup", copy.group, p?.workGroup], ["email", copy.email, p?.email], ["phoneOffice", copy.phone, p?.phoneOffice]] as const).map(([name, label, value]) => (
        <label className="flex flex-col gap-1 text-sm font-medium" key={name}>{label}<input className={FIELD} defaultValue={value} name={name} required={name === "firstTh" || name === "lastTh" || name === "positionTh"} /></label>
      ))}
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.unit}
        <select className={FIELD} defaultValue={p?.departmentCode ?? ""} name="departmentCode">
          <option value="">{copy.none}</option>
          {units.filter((u) => u.status !== "archived").map((u) => <option key={u.code} value={u.code}>{unitName(u)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">{copy.expertise}<input className={FIELD} defaultValue={p?.expertise.join(", ")} name="expertise" /></label>
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={p?.isPublic} name="isPublic" type="checkbox" />{copy.isPublic}</label>
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={!!p?.consentAt} name="consent" type="checkbox" />{copy.consent}</label>
      <button className="h-11 rounded-md border px-4 text-sm font-medium md:col-span-2" type="submit">{p ? copy.save : copy.create}</button>
    </form>
  );

  return (
    <section aria-labelledby="personnel-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="personnel-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      {form()}
      <p className="mt-2 text-sm" role="status">{message}</p>
      <ul className="mt-4 divide-y divide-neutral-200">
        {people.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.empty}</li> : null}
        {people.map((p) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={p.code}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{p.prefixTh}{p.firstTh} {p.lastTh}</p>
              <p className="text-xs text-neutral-600">{p.code} · {p.positionTh}{p.isPublic ? " · public" : ""}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-neutral-700">{copy.edit}</summary>
                {form(p)}
                <PrivatePanel call={call} code={p.code} copy={copy} />
              </details>
            </div>
            <label className="flex items-center gap-2 text-sm">{copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => void setStatus(p.code, event.target.value)} value={p.status}>
                <option value="active">{copy.active}</option>
                <option value="inactive">{copy.inactive}</option>
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Call = (path: string, method?: string, body?: unknown) => Promise<{ ok: boolean; status: number; payload: Record<string, unknown> }>;

function PrivatePanel({ call, code, copy }: { call: Call; code: string; copy: (typeof COPY)["en"] | (typeof COPY)["th"] }) {
  const [state, setState] = useState<"closed" | "denied" | "open">("closed");
  const [data, setData] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  async function open() {
    const r = await call(`/v1/personnel/${code}/private`);
    if (!r.ok) return setState("denied");
    setData(((r.payload.data as Record<string, string>) ?? {}));
    setState("open");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const k of ["birthDate", "gender", "address", "lineId", "facebookUrl", "personalPhone"]) body[k] = d.get(k);
    const nid = String(d.get("nationalId") ?? "");
    if (nid && !nid.includes("X")) body.nationalId = nid; // the masked value is not an edit
    const r = await call(`/v1/personnel/${code}/private`, "PATCH", body);
    setMsg(r.ok ? copy.saved : String(r.payload.message || r.payload.error || r.status));
  }
  return (
    <div className="mt-3 rounded-md border border-neutral-200 p-3">
      <p className="text-sm font-semibold">{copy.priv}</p>
      {state === "closed" ? <button className="mt-2 h-9 rounded-md border px-3 text-sm" onClick={() => void open()} type="button">{copy.load}</button> : null}
      {state === "denied" ? <p className="mt-2 text-sm">{copy.denied}</p> : null}
      {state === "open" ? (
        <form className="mt-2 grid gap-2" onSubmit={(event) => void save(event)}>
          <label className="flex flex-col gap-1 text-sm">{copy.nid}<input autoComplete="off" className={FIELD} defaultValue={data.nationalId ?? ""} name="nationalId" /></label>
          <label className="flex flex-col gap-1 text-sm">{copy.birth}<input className={FIELD} defaultValue={data.birthDate ?? ""} name="birthDate" /></label>
          <label className="flex flex-col gap-1 text-sm">{copy.gender}
            <select className={FIELD} defaultValue={data.gender ?? ""} name="gender"><option value="">—</option><option value="male">male</option><option value="female">female</option><option value="other">other</option><option value="unspecified">unspecified</option></select>
          </label>
          <label className="flex flex-col gap-1 text-sm">{copy.address}<textarea className={FIELD} defaultValue={data.address ?? ""} name="address" rows={2} /></label>
          <label className="flex flex-col gap-1 text-sm">{copy.line}<input className={FIELD} defaultValue={data.lineId ?? ""} name="lineId" /></label>
          <label className="flex flex-col gap-1 text-sm">{copy.fb}<input className={FIELD} defaultValue={data.facebookUrl ?? ""} name="facebookUrl" /></label>
          <label className="flex flex-col gap-1 text-sm">{copy.pphone}<input className={FIELD} defaultValue={data.personalPhone ?? ""} name="personalPhone" /></label>
          <button className="h-10 rounded-md border px-4 text-sm" type="submit">{copy.savePriv}</button>
          <p role="status">{msg}</p>
        </form>
      ) : null}
    </div>
  );
}
