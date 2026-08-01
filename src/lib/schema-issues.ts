// Collapse a Zod issue list into a `{ field: firstMessage }` map for inline
// form errors.
//
// Four byte-identical copies of this existed — `flattenPromoIssues`,
// `flattenProductIssues`, and a `flattenIssues` in each of the messages and
// settings schemas (those two had no consumers at all and are gone). The
// domain-named exports remain as thin aliases so their importers are
// unchanged; this is the one implementation behind them.
//
// Issues for the same path collapse to the FIRST message, which is what makes
// the map render one error per field rather than a stack.
export function flattenIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
