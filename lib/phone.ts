// A dial link must be a number a phone can actually dial. The source strings are the
// office's own publication, written for humans: "(+66) 0 5387 3400" and "0 5387 3400".
// After the +66 country code the trunk 0 has to go, otherwise the link is undialable
// internationally (this shipped as tel:+660****3400 before review caught it).
export function telHref(published: string): string {
  const cleaned = published.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (cleaned.startsWith("+660")) return "+66" + cleaned.slice(4);
  if (cleaned.startsWith("+66")) return cleaned;
  if (cleaned.startsWith("+")) return cleaned;
  return cleaned; // local format, e.g. 053873400
}
