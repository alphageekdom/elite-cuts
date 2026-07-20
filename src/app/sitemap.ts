import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo/site-url';

// Static routes only, on purpose. Product detail URLs are keyed by Mongo
// ObjectId, and the nightly demo reset re-creates every product with a new
// id — so baking product URLs into the sitemap would advertise links that
// die at the next reset. Product pages stay discoverable through the
// server-rendered catalog links; product entries can return here once the
// route resolves by stable slug (tracked follow-up).
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

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({ url: `${SITE_URL}${route}` }));
}
