// Maps fields that have both `.toJSON()` and `.toString()` to `string`.
// Covers Mongoose ObjectId (`_id`) and Date (`createdAt`/`updatedAt`).
type Serialized<T> = {
  [K in keyof T]: T[K] extends { toJSON(): unknown; toString(): string }
    ? string
    : T[K];
};

/**
 * Deep-serializes a Mongoose lean document so all ObjectIds and Dates
 * become plain strings/numbers suitable for the server→client boundary.
 * Uses JSON round-trip to handle nested arrays and embedded documents.
 */
export function convertToSerializableObject<T extends Record<string, unknown>>(
  leanDocument: T,
): Serialized<T> {
  return JSON.parse(JSON.stringify(leanDocument)) as Serialized<T>;
}
