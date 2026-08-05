// Canonical origin for absolute metadata URLs (metadataBase, sitemap, robots).
// NEXT_PUBLIC_SITE_URL wins so preview and production deploys can point at
// different origins without a code change.
//
// The fallback MUST be an origin this project actually owns. It previously read
// `https://elitecuts.vercel.app`, described as "the intended production deploy
// target" — but the deploy landed on `elite-cuts-three.vercel.app`, and
// `elitecuts.vercel.app` is an unrelated live site (a barber shop). With
// NEXT_PUBLIC_SITE_URL unset in Vercel, production served
// `<link rel="canonical" href="https://elitecuts.vercel.app">` on every page,
// a robots.txt pointing crawlers at that domain's sitemap, and a sitemap whose
// every entry named it — asking search engines to de-index this site in favour
// of a stranger's, and breaking the OG image on every shared link.
//
// So an unset variable has to fail toward our own origin, not merely toward
// something plausible.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://elite-cuts-three.vercel.app';
