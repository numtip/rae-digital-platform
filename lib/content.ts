// The contract every content file follows. Nothing here is fetched at runtime:
// these are the shapes the page copy has to satisfy so that a page can always show
// where its text came from and so that nothing is published without a source.
//
// `SourceLine` in components/page-shell.tsx takes a Provenance, so a page cannot print
// a source line without a url and a retrieval note. The gate over the raw content files
// is tests/content.test.mjs (`npm test`), which needs no build step.

export type Provenance = {
  /** Label in the page's own language, e.g. "ที่มาของข้อมูล" / "Source". */
  label: string;
  /** The official page the copy was transcribed from. Must be https. */
  url: string;
  /** When it was retrieved, in words the reader understands. */
  retrieved: string;
};

export type ExternalRef = {
  label: string;
  /** Must be https — the gate rejects plain http. */
  url: string;
};
