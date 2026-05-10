import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import { getSessionUser } from '@/utils/getSessionUser';

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

/**
 * Wraps a route handler with `connectDB` + admin auth check.
 * Returns 401/403 before calling the handler if the request is not from an admin.
 */
export function withAdmin(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    if (!sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    return handler(req, ctx);
  };
}

/**
 * Wraps a route handler with `connectDB` + session auth check.
 * Returns 401 before calling the handler if the user is not signed in.
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    return handler(req, ctx);
  };
}
