const HOST = "maejo365-my.sharepoint.com";

export class DocumentLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentLinkError";
  }
}

export function assertSharePointFileUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DocumentLinkError("storage URL is not a URL");
  }
  if (url.protocol !== "https:") throw new DocumentLinkError("storage URL must be https");
  if (url.hostname !== HOST) throw new DocumentLinkError("storage URL host is not the MJU tenant");
  const path = url.pathname.replace(/\/$/, "");
  if (!path || path.endsWith("/Forms") || !/\.[a-z0-9]{2,5}$/i.test(path.split("/").pop() ?? "")) {
    throw new DocumentLinkError("storage URL must point at a file, not a folder");
  }
  return url;
}
