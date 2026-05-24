// Escape special characters in a user-typed string so it's safe to plug into
// a `new RegExp(...)` constructor. Previously inlined in three different
// export/import routes with identical bodies.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
