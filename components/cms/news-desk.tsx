"use client";

import { useState, type FormEvent } from "react";
import { adminCopy } from "@/lib/cms/admin-copy";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
const FIELD = `min-h-11 w-full rounded-md border border-neutral-300 px-3 ${FOCUS}`;

type Article = {
  id: string;
  status: string;
  revisionReason?: string;
  titleTh: string;
  titleEn: string;
  source: string;
  pinned: boolean;
};

async function api(base: string, path: string, token: string, method = "GET", body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // The desk talks to a separate local process. When it is not running, an unhandled
    // rejection in the click handler left the reader with no feedback at all.
    return { ok: false, status: 0, payload: { error: "UNREACHABLE" } as { error?: unknown; message?: unknown } };
  }
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

export function NewsDesk({ locale, apiBase }: { locale: "th" | "en"; apiBase: string }) {
  const copy = adminCopy[locale];
  // status 0 = the fetch never reached the runtime (see api()).
  const describe = (result: { status: number; payload: { error?: unknown; message?: unknown } }) =>
    result.status === 0
      ? copy.unreachable
      : String(result.payload.message || result.payload.error || result.status);
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [message, setMessage] = useState<string>(copy.empty);
  const [reason, setReason] = useState("");

  async function refresh(nextToken = token) {
    const result = await api(apiBase, "/v1/news", nextToken);
    if (!result.ok) {
      setMessage(describe(result));
      return;
    }
    setItems(result.payload.articles ?? []);
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await api(apiBase, "/v1/login", "", "POST", {
      userId: String(data.get("userId") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (!result.ok || !result.payload.token) {
      setMessage(describe(result));
      return;
    }
    setToken(result.payload.token);
    setMessage(copy.login);
    await refresh(result.payload.token);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      id: selected?.id ?? `news-${Date.now()}`,
      titleTh: String(data.get("titleTh") ?? ""),
      titleEn: String(data.get("titleEn") ?? ""),
      source: String(data.get("source") ?? ""),
      pinned: false,
    };
    const result = selected
      ? await api(apiBase, `/v1/news/${selected.id}`, token, "PATCH", body)
      : await api(apiBase, "/v1/news", token, "POST", body);
    setMessage(result.ok ? body.id : describe(result));
    if (result.ok) setSelected(result.payload);
    await refresh();
  }

  async function act(action: "submit" | "approve" | "publish" | "return", reason?: string) {
    // Silently doing nothing on an unselected desk reads like a broken button.
    if (!selected) {
      setMessage(copy.selectFirst);
      return;
    }
    if (action === "return" && !String(reason ?? "").trim()) {
      setMessage(copy.reasonRequired);
      return;
    }
    const body = action === "return" ? { reason } : {};
    const result = await api(apiBase, `/v1/news/${selected.id}/${action}`, token, "POST", body);
    if (action === "return" && result.ok) setReason("");
    setMessage(result.ok ? result.payload.status : describe(result));
    if (result.ok) setSelected(result.payload);
    await refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <form className="grid gap-3" onSubmit={onLogin}>
        <label className="grid gap-1 text-sm font-medium" htmlFor="userId">
          {copy.user}
          <input className={FIELD} id="userId" name="userId" autoComplete="off" />
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor="password">
          {copy.password}
          <input className={FIELD} id="password" name="password" type="password" autoComplete="current-password" />
        </label>
        <button className={`min-h-11 rounded-md bg-brand-700 px-4 text-sm font-medium text-white ${FOCUS}`} type="submit">
          {copy.login}
        </button>
      </form>

      <div className="grid gap-4">
        <ul className="grid gap-2">
          {items.length === 0 ? <li className="text-sm text-neutral-600">{copy.empty}</li> : null}
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`min-h-11 w-full rounded-md border px-3 text-left text-sm ${FOCUS}`}
                type="button"
                onClick={() => setSelected(item)}
              >
                {locale === "th" ? item.titleTh : item.titleEn} · {item.status}
              </button>
            </li>
          ))}
        </ul>

        <form className="grid gap-3" onSubmit={onSave}>
          <label className="grid gap-1 text-sm font-medium" htmlFor="titleTh">
            {copy.titleTh}
            <input className={FIELD} id="titleTh" name="titleTh" defaultValue={selected?.titleTh ?? ""} key={`${selected?.id ?? "new"}-th`} />
          </label>
          <label className="grid gap-1 text-sm font-medium" htmlFor="titleEn">
            {copy.titleEn}
            <input className={FIELD} id="titleEn" name="titleEn" defaultValue={selected?.titleEn ?? ""} key={`${selected?.id ?? "new"}-en`} />
          </label>
          <label className="grid gap-1 text-sm font-medium" htmlFor="source">
            {copy.source}
            <input className={FIELD} id="source" name="source" type="url" defaultValue={selected?.source ?? ""} key={`${selected?.id ?? "new"}-src`} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={`min-h-11 rounded-md bg-brand-600 px-4 text-sm font-medium text-white ${FOCUS}`} type="submit">
              {copy.save}
            </button>
            <button className={`min-h-11 rounded-md border px-4 text-sm ${FOCUS}`} type="button" onClick={() => act("submit")}>
              {copy.submit}
            </button>
            <button className={`min-h-11 rounded-md border px-4 text-sm ${FOCUS}`} type="button" onClick={() => act("approve")}>
              {copy.approve}
            </button>
            <button className={`min-h-11 rounded-md border px-4 text-sm ${FOCUS}`} type="button" onClick={() => act("publish")}>
              {copy.publish}
            </button>
          </div>
          <label className="grid gap-1 text-sm font-medium" htmlFor="revisionReason">
            {copy.reasonLabel}
            <input
              className={FIELD}
              id="revisionReason"
              name="revisionReason"
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </label>
          <div>
            <button
              className={`min-h-11 rounded-md border border-gold-600 px-4 text-sm text-neutral-800 ${FOCUS}`}
              type="button"
              onClick={() => act("return", reason)}
            >
              {copy.returnFor}
            </button>
          </div>
        </form>

        <section aria-labelledby="preview" className="rounded-md bg-surface-50 p-4">
          <h3 className="text-sm font-bold" id="preview">
            {copy.preview}
          </h3>
          <p className="mt-2 text-lg font-bold">{selected?.titleTh}</p>
          <p>{selected?.titleEn}</p>
          <p className="text-sm text-neutral-600">
            {copy.status}: {selected?.status ?? "—"}
          </p>
          {selected?.revisionReason && (
            <p className="mt-2 text-sm text-neutral-700">
              {copy.revisionNote} {selected.revisionReason}
            </p>
          )}
        </section>
        <p role="status">{message}</p>
      </div>
    </div>
  );
}
