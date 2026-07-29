// Recently-viewed cuts, stored in the browser.
//
// The profile's "Recently viewed" panel shipped as a stub: it queried the
// three newest in-stock products and captioned them "Cuts you looked at
// recently", which nothing backed. This is the tracking that makes the caption
// true.
//
// Slugs, not ObjectIds, are the stored key. The nightly demo reset re-creates
// the catalog and rotates every ObjectId, but re-derives identical slugs from
// the seeded names — an id-keyed list would silently empty itself every
// morning. Slugs are also what the product URL uses, so nothing has to be
// translated to build a link.
//
// Reads and writes are wrapped because a browser with storage blocked throws
// on access rather than returning null, and this list is a convenience — it
// must never be the reason a page fails to render.

export const RECENTLY_VIEWED_KEY = 'elitecuts:recently-viewed';

/** How many cuts to remember. The panel shows fewer; the surplus covers ones since withdrawn. */
export const RECENTLY_VIEWED_LIMIT = 8;

/** Newest first. Returns [] when storage is unavailable or holds anything unexpected. */
export function readRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .slice(0, RECENTLY_VIEWED_LIMIT);
  } catch {
    return [];
  }
}

/** Moves `slug` to the front, de-duplicating. Silently no-ops if storage is unavailable. */
export function recordRecentlyViewed(slug: string): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const next = [
      slug,
      ...readRecentlyViewed().filter((s) => s !== slug),
    ].slice(0, RECENTLY_VIEWED_LIMIT);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // Storage full, blocked, or in private mode. Nothing to recover.
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
  } catch {
    // As above.
  }
}
