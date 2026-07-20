import type { MetadataRoute } from 'next';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import { SITE_URL } from '@/lib/seo/site-url';

const STATIC_ROUTES = [
  '',
  '/products',
  '/our-story',
  '/contact',
  '/rewards',
  '/demo',
  '/terms',
  '/privacy',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();
  // Product URLs are keyed by slug, which survives the nightly demo reset
  // (identical seeded names re-derive identical slugs). Same visibility
  // filter as the catalog listing.
  const products = await Product.find({
    'images.0': { $exists: true },
    isActive: { $ne: false },
    slug: { $type: 'string', $gt: '' },
  })
    .select('slug updatedAt')
    .lean();

  return [
    ...STATIC_ROUTES.map((route) => ({ url: `${SITE_URL}${route}` })),
    ...products.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt,
    })),
  ];
}
