// Canonical customer-facing product URL. Slug is the durable key — the
// nightly demo reset rotates ObjectIds but re-derives identical slugs from
// the seeded names. The _id fallback covers any pre-slug legacy document;
// the product route permanently redirects those to their slug URL.
export const productPath = (product: { slug?: string; _id: string }): string =>
  `/products/${product.slug || product._id}`;
