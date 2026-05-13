// Split a shop name into "before" + "italic" segments so brand surfaces can
// render the EliteCuts-style two-tone wordmark when the name ends in "Cuts".
// Any other name renders as a single segment so admin-renamed shops don't
// get random italics inside.
export function splitWordmark(name: string): { before: string; italic: string | null } {
  if (name.endsWith('Cuts') && name.length > 4) {
    return { before: name.slice(0, -4), italic: 'Cuts' };
  }
  return { before: name, italic: null };
}
