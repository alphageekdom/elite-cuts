// Canonical origin for absolute metadata URLs (metadataBase, sitemap,
// robots). NEXT_PUBLIC_SITE_URL wins so preview and production deploys can
// point at different origins without a code change; the fallback matches the
// intended production deploy target.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://elitecuts.vercel.app';
