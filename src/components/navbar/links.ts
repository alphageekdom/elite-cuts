export const PRIMARY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/about', label: 'Our Story' },
] as const;

// Sub-routes match too: /products/[id] keeps "Shop" active. Home is
// exact-match only (otherwise every route would match it).
export const isActive = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
};
