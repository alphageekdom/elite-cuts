import { withAuth } from 'next-auth/middleware';

export default withAuth({});

export const config = {
  matcher: [
    '/products/add',
    '/profile',
    '/products/saved',
    '/messages',
    '/dashboard',
    '/cart',
  ],
};
