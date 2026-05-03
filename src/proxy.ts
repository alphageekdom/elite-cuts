import { withAuth } from 'next-auth/middleware';

const ADMIN_ROUTE_PREFIXES = ['/dashboard', '/products/add'] as const;

const isAdminRoute = (pathname: string): boolean =>
  ADMIN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p)) ||
  /^\/products\/[^/]+\/edit$/.test(pathname);

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      if (isAdminRoute(req.nextUrl.pathname)) {
        return Boolean(token.isAdmin);
      }
      return true;
    },
  },
});

export const config = {
  matcher: [
    '/products/add',
    '/products/:id/edit',
    '/profile',
    '/products/saved',
    '/messages',
    '/dashboard',
    '/checkout',
  ],
};
