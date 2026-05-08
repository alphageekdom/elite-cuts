export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Type-safe Array.includes for readonly string union arrays.
// TypeScript's strict overload requires the argument to match the element type;
// this helper accepts any string and narrows it to T on truthy return.
export const isIn = <T extends string>(
  arr: readonly T[],
  val: string,
): val is T => (arr as readonly string[]).includes(val);
