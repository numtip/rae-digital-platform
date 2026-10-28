"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminCopy } from "@/lib/cms/admin-copy";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
// A field is a fixed 44 px box. `min-h-11` alone let the input stretch to the height of its grid
// row, which is what made the login fields grow to 187 px on a wide screen.
const FIELD = `h-11 w-full shrink-0 rounded-md border border-neutral-300 px-3 ${FOCUS}`;
const AREA = `min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2 ${FOCUS}`;
const LABEL = "flex flex-col gap-1 text-sm font-medium";

type Article = {
  id: string;
  status: string;
  revisionReason?: string;
  media?: { filename: string; captionTh: string; captionEn: string; altTh: string; altEn: string }[];
  titleTh: string;
  titleEn: string;
  source: string;
  pinned: boolean;
  bodyTh?: string[];
  bodyEn?: string[];
};

// <img src> cannot carry the bearer token, so a draft's image would 404 in the desk. Fetch it with
// the token, then show the object URL.
function PrivateImage({ src, token, alt }: { src: string; token: string; alt: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let objectUrl = "";
    let live = true;
    void (async () => {
      const response = await fetch(src, { headers: { authorization: "Bearer " + token } }).catch(() => null);
      if (!response?.ok || !live) return;
      objectUrl = URL.createObjectURL(await response.blob());
      setUrl(objectUrl);
    })();
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className="h-20 w-full rounded object-cover" src={url} />
  ) : (
    <div aria-hidden="true" className="h-20 w-full rounded bg-neutral-100" />
  );
}

type Payload = {
  error?: unknown;
  message?: unknown;
  token?: unknown;
  articles?: unknown;
  media?: unknown;
  status?: unknown;
};
type Result = { ok: boolean; status: number; payload: Payload };

async function api(base: string, path: string, token: string, method = "GET", body?: unknown): Promise<Result> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // The desk talks to a separate local process. When it is not running, an unhandled
    // rejection in the click handler left the reader with no feedback at all.
    return { ok: false, status: 0, payload: { error: "UNREACHABLE" } };
  }
  const payload = (await response.json().catch(() => ({}))) as Payload;
  return { ok: response.ok, status: response.status, payload };
}

export function NewsDesk({ locale, apiBase }: { locale: "th" | "en"; apiBase: string }) {
  const copy = adminCopy[locale];
  // status 0 = the fetch never reached the runtime (see api()).
  const describe = (result: Result) =>
    result.status === 0
      ? copy.unreachable
      : String(result.payload.message || result.payload.error || result.status);
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [message, setMessage] = useState<string>(copy.empty);
  const [reason, setReason] = useState("");
  const [media, setMedia] = useState<Article["media"]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  // One place clears everything a session owned, so signing out never leaves the previous account's
  // list, open draft or pending upload on screen.
  function signOut(notice = "") {
    setToken("");
    setItems([]);
    setSelected(null);
    setMedia([]);
    setPending([]);
    setReason("");
    setMessage(copy.empty);
    setError(notice);
  }

  // An expired session answers 401, which sends the reader back to the login card instead of leaving
  // an empty desk that looks broken.
  function fail(result: Result) {
    if (result.status === 401) {
      signOut(copy.sessionExpired);
      return;
    }
    setMessage(describe(result));
  }

  async function loadMedia(article: Article | null, nextToken = token) {
    if (!article) {
      setMedia([]);
      return;
    }
    // The list is only a preview: the files themselves are served from the same loopback API.
    const result = await api(apiBase, `/v1/news/${article.id}/media`, nextToken);
    if (!result.ok && result.status === 401) {
      signOut(copy.sessionExpired);
      return;
    }
    setMedia(result.ok ? ((result.payload.media as Article["media"]) ?? []) : []);
  }

  async function refresh(nextToken = token) {
    const result = await api(apiBase, "/v1/news", nextToken);
    if (!result.ok) {
      fail(result);
      return;
    }
    setItems((result.payload.articles as Article[]) ?? []);
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const userId = String(data.get("userId") ?? "");
    const password = String(data.get("password") ?? "");
    setSigningIn(true);
    setError("");
    const result = await api(apiBase, "/v1/login", "", "POST", { userId, password });
    setSigningIn(false);
    const nextToken = String(result.payload.token ?? "");
    if (!result.ok || !nextToken) {
      setError(describe(result));
      return;
    }
    setToken(nextToken);
    setMessage(copy.login);
    await refresh(nextToken);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      id: selected?.id ?? `news-${Date.now()}`,
      titleTh: String(data.get("titleTh") ?? ""),
      titleEn: String(data.get("titleEn") ?? ""),
      source: String(data.get("source") ?? ""),
      bodyTh: String(data.get("bodyTh") ?? ""),
      bodyEn: String(data.get("bodyEn") ?? ""),
      pinned: false,
    };
    const result = selected
      ? await api(apiBase, `/v1/news/${selected.id}`, token, "PATCH", body)
      : await api(apiBase, "/v1/news", token, "POST", body);
    if (!result.ok) {
      fail(result);
      return;
    }
    setMessage(body.id);
    setSelected(result.payload as Article);
    await refresh();
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return setMessage(copy.selectFirst);
    if (pending.length === 0) return setMessage(copy.chooseImages);
    const data = new FormData(event.currentTarget);
    setBusy(true);
    for (const [index, file] of pending.entries()) {
      const encoded = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
        reader.readAsDataURL(file);
      });
      const result = await api(apiBase, `/v1/news/${selected.id}/media`, token, "POST", {
        dataBase64: encoded,
        captionTh: String(data.get(`captionTh-${index}`) ?? ""),
        captionEn: String(data.get(`captionEn-${index}`) ?? ""),
        altTh: String(data.get(`altTh-${index}`) ?? ""),
        altEn: String(data.get(`altEn-${index}`) ?? ""),
      });
      if (!result.ok) {
        setBusy(false);
        fail(result);
        return;
      }
    }
    setBusy(false);
    setPending([]);
    setMessage(copy.uploaded);
    await loadMedia(selected);
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
    if (!result.ok) {
      fail(result);
      return;
    }
    if (action === "return") setReason("");
    setMessage(String(result.payload.status ?? ""));
    setSelected(result.payload as Article);
    await refresh();
  }

  // Before a session exists the page is a login card and nothing else: no list, no editor, nothing
  // that looks like a desk someone could type into without signing in.
  if (!token) {
    return (
      <div className="mx-auto w-full max-w-[400px]">
        <form
          aria-busy={signingIn}
          className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
          onSubmit={onLogin}
        >
          <p className="text-sm text-neutral-700">{copy.loginHint}</p>
          <label className={LABEL} htmlFor="userId">
            {copy.user}
            <input autoComplete="username" className={FIELD} id="userId" name="userId" />
          </label>
          <label className={LABEL} htmlFor="password">
            {copy.password}
            <input autoComplete="current-password" className={FIELD} id="password" name="password" type="password" />
          </label>
          <button
            className={`h-12 rounded-md bg-brand-700 px-4 text-sm font-medium text-white disabled:opacity-60 ${FOCUS}`}
            disabled={signingIn}
            type="submit"
          >
            {signingIn ? copy.signingIn : copy.login}
          </button>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <section aria-labelledby="news-desk" className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="news-desk">
          {copy.news}
        </h2>
        <button className={`h-11 rounded-md border px-4 text-sm ${FOCUS}`} onClick={() => signOut()} type="button">
          {copy.logout}
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="grid gap-4">
          <ul className="grid gap-2">
            {items.length === 0 ? <li className="text-sm text-neutral-600">{copy.empty}</li> : null}
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={`min-h-11 w-full rounded-md border px-3 text-left text-sm ${FOCUS}`}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    void loadMedia(item);
                  }}
                >
                  {locale === "th" ? item.titleTh : item.titleEn} · {item.status}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4">
          <form className="grid gap-3" onSubmit={onSave}>
            <label className={LABEL} htmlFor="titleTh">
              {copy.titleTh}
              <input className={FIELD} defaultValue={selected?.titleTh ?? ""} id="titleTh" key={`${selected?.id ?? "new"}-th`} name="titleTh" />
            </label>
            <label className={LABEL} htmlFor="titleEn">
              {copy.titleEn}
              <input className={FIELD} defaultValue={selected?.titleEn ?? ""} id="titleEn" key={`${selected?.id ?? "new"}-en`} name="titleEn" />
            </label>
            <label className={LABEL} htmlFor="source">
              {copy.source}
              <input className={FIELD} defaultValue={selected?.source ?? ""} id="source" key={`${selected?.id ?? "new"}-src`} name="source" type="url" />
            </label>
            <label className={LABEL} htmlFor="bodyTh">
              {copy.bodyTh}
              <textarea className={AREA} defaultValue={(selected?.bodyTh ?? []).join("\n\n")} id="bodyTh" key={`${selected?.id ?? "new"}-body-th`} name="bodyTh" rows={4} />
            </label>
            <label className={LABEL} htmlFor="bodyEn">
              {copy.bodyEn}
              <textarea className={AREA} defaultValue={(selected?.bodyEn ?? []).join("\n\n")} id="bodyEn" key={`${selected?.id ?? "new"}-body-en`} name="bodyEn" rows={4} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className={`h-11 rounded-md bg-brand-600 px-4 text-sm font-medium text-white ${FOCUS}`} type="submit">
                {copy.save}
              </button>
              <button className={`h-11 rounded-md border px-4 text-sm ${FOCUS}`} type="button" onClick={() => act("submit")}>
                {copy.submit}
              </button>
              <button className={`h-11 rounded-md border px-4 text-sm ${FOCUS}`} type="button" onClick={() => act("approve")}>
                {copy.approve}
              </button>
              <button className={`h-11 rounded-md border px-4 text-sm ${FOCUS}`} type="button" onClick={() => act("publish")}>
                {copy.publish}
              </button>
            </div>
            <label className={LABEL} htmlFor="revisionReason">
              {copy.reasonLabel}
              <input className={FIELD} id="revisionReason" name="revisionReason" onChange={(event) => setReason(event.target.value)} value={reason} />
            </label>
            <div>
              <button
                className={`h-11 rounded-md border border-gold-600 px-4 text-sm text-neutral-800 ${FOCUS}`}
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
            {(media?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-bold" id="gallery">
                  {copy.gallery}
                </h4>
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-labelledby="gallery">
                  {(media ?? []).map((item) => (
                    <li key={item.filename} className="rounded border border-neutral-200 bg-white p-2">
                      <PrivateImage
                        alt={(locale === "th" ? item.altTh : item.altEn) || item.captionTh || copy.gallery}
                        src={`${apiBase}/v1/media/${selected?.id}/${item.filename}`}
                        token={token}
                      />
                      <p className="mt-1 text-xs text-neutral-600">
                        {(locale === "th" ? item.captionTh : item.captionEn) || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected?.status === "published" && (
              <p className="mt-2">
                <a className="text-sm underline" href={`${apiBase}/preview/${selected.id}?lang=${locale}`} rel="noreferrer" target="_blank">
                  {copy.openPreview}
                </a>
              </p>
            )}

            {selected?.revisionReason && (
              <p className="mt-2 text-sm text-neutral-700">
                {copy.revisionNote} {selected.revisionReason}
              </p>
            )}
          </section>

          <form className="grid gap-3 rounded-md border border-neutral-200 p-4" onSubmit={onUpload}>
            <h3 className="text-sm font-bold">{copy.addImages}</h3>
            <p className="text-xs text-neutral-600">{copy.galleryHint}</p>
            <label className={LABEL} htmlFor="images">
              {copy.chooseImages}
              <input
                accept="image/png,image/jpeg,image/webp"
                className={FIELD}
                id="images"
                multiple
                onChange={(event) => setPending([...(event.target.files ?? [])])}
                type="file"
              />
            </label>
            {pending.map((file, index) => (
              <fieldset className="grid gap-2 rounded border border-neutral-200 p-3" key={`${file.name}-${index}`}>
                <legend className="px-1 text-xs text-neutral-600">{`${index + 1}. ${file.name}`}</legend>
                <input className={FIELD} name={`captionTh-${index}`} placeholder={copy.captionTh} />
                <input className={FIELD} name={`captionEn-${index}`} placeholder={copy.captionEn} />
                <input className={FIELD} name={`altTh-${index}`} placeholder={copy.altTh} />
                <input className={FIELD} name={`altEn-${index}`} placeholder={copy.altEn} />
              </fieldset>
            ))}
            <button className={`h-11 rounded-md border px-4 text-sm ${FOCUS}`} disabled={busy} type="submit">
              {busy ? copy.uploading : copy.upload}
            </button>
          </form>
          <p role="status">{message}</p>
        </div>
      </div>
    </section>
  );
}
