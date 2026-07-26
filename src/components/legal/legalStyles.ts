// Chrome shared by both legal shells, in its own module so neither has to
// import from the other. `LegalSection`/`LegalPage` (Privacy) and
// `LegalDocument` (Terms) both read from here, so deleting the old pair when
// Privacy migrates touches nothing the new shell depends on.
//
// Named after the sibling convention (`authStyles.ts`, `checkoutStyles.ts`).

// Inline link inside legal prose. Underlined rather than colour-only, so the
// link is distinguishable without relying on hue.
export const LEGAL_LINK_CLASS =
  'text-oxblood underline underline-offset-4 decoration-oxblood/40 hover:decoration-oxblood';
