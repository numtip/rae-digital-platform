// JSON-LD goes into a <script> block as raw text. JSON.stringify leaves "<" alone, so a title that
// carries "</script>" would close the element and run what follows. "<" is the same string to
// a JSON parser and inert to the HTML parser.
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
