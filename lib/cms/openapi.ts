// M23 public API description (OpenAPI 3.0.3). Documents ONLY the read-only public endpoints the site itself uses; the
// desk API (/v1/news, /v1/documents, …) needs a session and is not part of this contract. The contract test keeps
// this honest: every documented path must answer 200, and every public GET route in the runtime must be documented.

const list = (key: string, ref: string, extra: Record<string, unknown> = {}) => ({
  type: "object",
  required: [key],
  properties: { [key]: { type: "array", items: { $ref: `#/components/schemas/${ref}` } }, ...extra },
});
const get = (summary: string, schema: unknown, extra: Record<string, unknown> = {}) => ({
  get: { summary, tags: ["public"], responses: { "200": { description: "OK", content: { "application/json": { schema } } } }, ...extra },
});
const str = { type: "string" };
const iso = { type: "string", format: "date-time" };

export function buildOpenApi(serverUrl = "/cms-api") {
  return {
    openapi: "3.0.3",
    info: {
      title: "RAE public content API",
      version: "1.0.0",
      description:
        "Read-only, unauthenticated JSON for the public content of the RAE site (MJU Research and Academic Service Office). Only published, public records are returned; drafts, authors and internal fields never appear. The authenticated desk API is not part of this contract.",
    },
    servers: [{ url: serverUrl }],
    tags: [{ name: "public" }],
    paths: {
      "/v1/public/documents": {
        ...get("Current, public registered documents (files stay in Microsoft 365; open them through the site's counted open link)", list("documents", "Document"), {
          parameters: [{ name: "category", in: "query", required: false, schema: { type: "string", enum: ["administration", "research", "academic-services"] } }],
        }),
      },
      "/v1/public/documents/{code}": {
        get: {
          summary: "One current, public document",
          tags: ["public"],
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string", pattern: "^RAE-DC-\\d{4,}$" } }],
          responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Document" } } } }, "404": { description: "Not found or not public" } },
        },
      },
      "/v1/public/knowledge": { ...get("Published FAQ entries, ordered", list("entries", "FaqEntry")) },
      "/v1/public/media": { ...get("Published library images (metadata and a URL; the bytes are served at that URL with their stored type)", list("assets", "MediaAsset")) },
      "/v1/public/events": { ...get("Published and cancelled events, by start time", list("events", "Event")) },
      "/v1/public/departments": { ...get("Published organisation units (flat; nest by parentCode)", list("departments", "Department")) },
      "/v1/public/personnel": { ...get("Directory of active people who are public and have recorded consent (work contact only; no restricted data)", list("personnel", "Person")) },
      "/v1/public/announcements": { ...get("Announcements live right now (published and inside their window)", list("announcements", "Announcement")) },
      "/v1/public/contact/config": {
        ...get("Whether the contact form is on, and the owner-approved privacy notice", {
          type: "object",
          required: ["enabled"],
          properties: { enabled: { type: "boolean" }, notice: { type: "object", properties: { version: str, th: str, en: str } } },
        }),
      },
    },
    components: {
      schemas: {
        Document: { type: "object", required: ["code", "category", "titleTh", "titleEn"], properties: { code: str, category: str, titleTh: str, titleEn: str, fileType: str, version: str, note: str, updatedAt: iso, downloadCount: { type: "integer" } } },
        MediaAsset: { type: "object", required: ["code", "titleTh", "titleEn", "mime", "url"], properties: { code: str, titleTh: str, titleEn: str, altTh: str, altEn: str, captionTh: str, captionEn: str, mime: { type: "string", enum: ["image/png", "image/jpeg", "image/webp"] }, bytes: { type: "integer" }, url: str, updatedAt: iso } },
        FaqEntry: { type: "object", required: ["code", "questionTh", "questionEn", "answerTh", "answerEn"], properties: { code: str, topic: str, questionTh: str, questionEn: str, answerTh: str, answerEn: str, sortOrder: { type: "integer" }, updatedAt: iso } },
        Event: { type: "object", required: ["code", "titleTh", "titleEn", "startsAt", "cancelled"], properties: { code: str, titleTh: str, titleEn: str, descriptionTh: str, descriptionEn: str, locationTh: str, locationEn: str, startsAt: iso, endsAt: { ...iso, nullable: true }, cancelled: { type: "boolean" }, updatedAt: iso } },
        Department: { type: "object", required: ["code", "nameTh", "nameEn"], properties: { code: str, parentCode: { ...str, nullable: true }, nameTh: str, nameEn: str, descriptionTh: str, descriptionEn: str, sortOrder: { type: "integer" }, head: { nullable: true, allOf: [{ $ref: "#/components/schemas/PersonRef" }] } } },
        PersonRef: { type: "object", required: ["code", "firstTh", "lastTh"], properties: { code: str, prefixTh: str, firstTh: str, lastTh: str, firstEn: str, lastEn: str, positionTh: str, positionEn: str } },
        Person: { type: "object", required: ["code", "firstTh", "lastTh", "positionTh"], properties: { code: str, prefixTh: str, firstTh: str, lastTh: str, firstEn: str, lastEn: str, positionTh: str, positionEn: str, academicRank: str, workGroup: str, departmentCode: { ...str, nullable: true }, email: str, phoneOffice: str, expertise: { type: "array", items: str } } },
        Announcement: { type: "object", required: ["code", "kind", "titleTh", "titleEn", "endsAt"], properties: { code: str, kind: { type: "string", enum: ["banner", "popup", "ticker"] }, titleTh: str, titleEn: str, bodyTh: str, bodyEn: str, linkUrl: str, endsAt: iso } },
      },
    },
  };
}
