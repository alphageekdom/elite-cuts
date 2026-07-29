// The customer-facing order reference.
//
// `#EC-` + the last four of the Mongo id was already the convention in the
// profile order list, the notification builder and the admin serializers, but
// each of those built the string inline, and two surfaces had drifted: the
// confirmation page printed the last *eight* characters with no `EC-` prefix,
// and the points ledger printed the last *six*. A customer therefore read a
// different reference for the same order depending on which page they were on
// — and the counter is asked to match it against the one on the receipt.
//
// Both forms live here so a caller picks by what it renders, not by
// re-slicing: `orderRef` for anywhere the string stands alone, `orderRefBare`
// for the handful of places that supply the `#` as decoration (the
// confirmation hero) or that copy the value to a clipboard, where a leading
// `#` is noise the customer would have to delete.

/** `EC-5D61` — no leading `#`. */
export function orderRefBare(orderId: string): string {
  return `EC-${String(orderId).slice(-4).toUpperCase()}`;
}

/** `#EC-5D61` — the form a customer reads. */
export function orderRef(orderId: string): string {
  return `#${orderRefBare(orderId)}`;
}
