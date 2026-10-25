// The contract every content file follows. Nothing here is fetched at runtime:
// these are the shapes the page copy has to satisfy so that a page can always show
// where its text came from and so that nothing is published without a source.
//
// The gate that enforces this on the raw content files is scripts/check-content.mjs
// (`npm test`), because those files are TypeScript sources and the check must run
// without a build step.

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
