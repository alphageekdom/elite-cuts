// Fields on a Product that only the admin side has any use for, excluded from
// every read that reaches a customer — the public API list, the catalog page,
// the home page's featured strip, and the confirmation page's suggestions.
//
// `supplier`, `parLevel` and `reorderPoint` are the shop's vendor and inventory
// thresholds; `sku` is an internal stock code; `createdBy` is an admin's user
// id. None are rendered by any customer surface (the product page's spec strip
// reads `cutType` and `qualityTier` instead), but every one of those reads sent
// full documents, so all five were readable by anyone — over the API with no
// auth at all, and in the flight payload of the catalog page.
//
// Mongoose exclusion projection: a leading `-` on each field, which is why this
// can't be mixed with an inclusion projection in the same query.
export const PUBLIC_PRODUCT_PROJECTION =
  '-sku -supplier -parLevel -reorderPoint -createdBy';
