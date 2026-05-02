// Stringify Mongoose ObjectId-like values on a `.lean()` document so the
// result crosses the server/client boundary as plain JSON. Mutates input
// for parity with the old helper; safe because callers always pass a
// fresh lean doc.
export function convertToSerializableObject<T extends Record<string, unknown>>(
  leanDocument: T
): T {
  for (const key of Object.keys(leanDocument)) {
    const value = leanDocument[key];
    if (
      value !== null &&
      typeof value === 'object' &&
      'toJSON' in value &&
      'toString' in value
    ) {
      (leanDocument as Record<string, unknown>)[key] = String(value);
    }
  }
  return leanDocument;
}
