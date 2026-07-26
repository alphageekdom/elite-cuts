// Chrome shared by the legal pages, in its own leaf module so a page can pull
// it without importing the shell and vice versa. Kept separate from
// `LegalDocument` deliberately: that independence is what let the old
// `LegalPage`/`LegalSection` pair be deleted without touching anything the
// current shell depends on.
//
// Named after the sibling convention (`authStyles.ts`, `checkoutStyles.ts`).

// Inline link inside legal prose. Underlined rather than colour-only, so the
// link is distinguishable without relying on hue.
export const LEGAL_LINK_CLASS =
  'text-oxblood underline underline-offset-4 decoration-oxblood/40 hover:decoration-oxblood';
