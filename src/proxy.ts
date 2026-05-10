import { withAuth } from 'next-auth/middleware';

const ADMIN_ROUTE_PREFIXES = ['/dashboard'] as const;

const isAdminRoute = (pathname: string): boolean =>
  ADMIN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));

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
    '/profile',
    '/cart',
    '/checkout/:path*',
    '/receipt/:path*',
    '/messages',
    '/dashboard',
    '/dashboard/:path*',
  ],
};
