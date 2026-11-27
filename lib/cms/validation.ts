export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

export function assertBilingual(fields: { titleTh: string; titleEn: string; source: string }): void {
  if (!fields.titleTh.trim() || !fields.titleEn.trim()) {
    throw new ContentValidationError("both Thai and English titles are required");
  }
  if (!fields.source.trim().startsWith("https://")) {
    throw new ContentValidationError("a source must be an https URL");
  }
}

export function assertLocalPassword(password: string): void {
  if (password.length < 12) throw new ContentValidationError("password must be at least 12 characters");
}
