// Shared outcome-collection for the admin bulk actions (orders status,
// products publish/unpublish/delete, customer points).
//
// The bug this exists to prevent: `Promise.all(ids.map(fetch))` only rejects
// on a *network* failure — an HTTP 403 or 400 resolves normally, so a bulk
// handler that never reads `res.ok` applies its optimistic update and fires
// its success toast even when every request was refused. The demo admin hits
// exactly that: the order-status and points endpoints refuse demo sessions,
// and the old handlers showed "2 orders updated" over two 403s, with the lie
// standing until the next reload.
//
// The customers bulk-delete handler pioneered the honest shape (per-response
// `ok`, apply only successes, partial-failure toast); this generalizes it so
// the other bulk handlers can't drift back.

// Structural subset of Response so tests can drive this with plain objects.
type BulkResponse = { ok: boolean; json: () => Promise<unknown> };

export type BulkOutcome = {
  okIds: string[];
  failCount: number;
  // Server-provided message from the first failed response, when it had a
  // JSON body with one. Lets a total failure surface the real reason
  // ("Demo admin can't modify orders") instead of a generic toast.
  firstErrorMessage: string | null;
};

export async function runBulk(
  ids: string[],
  request: (id: string) => Promise<BulkResponse>,
): Promise<BulkOutcome> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await request(id);
        if (res.ok) return { id, ok: true as const, message: null };
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        return { id, ok: false as const, message: body.message ?? null };
      } catch {
        // Network-level failure counts as a failed row, not a thrown bulk.
        return { id, ok: false as const, message: null };
      }
    }),
  );

  const okIds = results.filter((r) => r.ok).map((r) => r.id);
  const firstErrorMessage =
    results.find((r) => !r.ok && r.message)?.message ?? null;
  return { okIds, failCount: ids.length - okIds.length, firstErrorMessage };
}

// "Updated 1 of 3 — 2 failed", matching the wording the customers bulk
// delete already ships. Only for partial outcomes; total success and total
// failure keep their own messages at the call site.
export function partialFailureMessage(
  verbed: string,
  okCount: number,
  total: number,
): string {
  return `${verbed} ${okCount} of ${total} — ${total - okCount} failed`;
}
