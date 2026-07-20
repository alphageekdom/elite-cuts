import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo/site-url';

// /demo stays crawlable on purpose — it is a feature of the portfolio.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/api',
        '/profile',
        '/checkout',
        '/cart',
        '/receipt',
        '/login',
        '/register',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
