import { isDemoAdmin, type DemoCheckable } from '@/lib/auth/demo-permissions';
import { slugify } from '@/lib/slugify';
import { DEMO_PRODUCTS } from './seed/products';
import { DEMO_PROMOS } from './seed/promos';

// The snapshot's natural keys, derived in one place.
//
// `restore.ts` upserts on these, `verify.ts` asserts against them and
// `dry-run.ts` counts against them — three independent derivations of the one
// link this file's comment below calls "the only link between a live row and
// its snapshot entry". Two of them were byte-identical copies.
//
// The product seed carries no slug: the model derives it from `name` in a
// pre-validate hook, so anything comparing against the snapshot has to derive
// it the same way. That is exactly the sort of rule that should exist once.
export const expectedProductSlugs = (): string[] =>
  DEMO_PRODUCTS.map((p) => slugify(p.name));

export const expectedPromoCodes = (): string[] => DEMO_PROMOS.map((p) => p.code);

// The nightly demo restore matches a seeded row on its natural key — a
// product's `slug`, a promo's `code`. Those keys are the only link between a
// live row and its snapshot entry.
//
// Renaming one breaks that link in a way nothing downstream can repair. The
// restore stops finding the row, re-creates the snapshot entry as a *second*
// row, and the renamed original is left behind permanently: it carries no
// `createdBy`, so the ownership-scoped delete skips it, and the seeded-cut
// guard on the delete endpoint refuses to let a demo admin remove it by hand
// either. One rename per visitor, compounding nightly.
//
// So demo sessions keep whatever key the row already has. This is a silent
// pin rather than a rejection, matching how the product route already treats
// a blank slug on edit — the field is an advanced, rarely-touched input, and
// failing the whole save over it would be a worse trade. Real admins are
// unaffected and can rename freely.
export const pinNaturalKeyForDemo = <T extends string | undefined>(
  actor: DemoCheckable | null | undefined,
  submitted: T,
  persisted: T,
): T => (isDemoAdmin(actor) ? persisted : submitted);
