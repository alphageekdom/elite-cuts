import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import { getSessionUser } from '@/utils/getSessionUser';

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;
type AdminHandler = (req: NextRequest, userId: string) => Promise<NextResponse>;

/**
 * Wraps a route handler with `connectDB` + admin auth check.
 * Passes the verified userId to the handler so it does not need to call
 * getSessionUser() a second time.
 */
export function withAdmin(handler: AdminHandler): RouteHandler {
  return async (req) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    if (!sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    return handler(req, sessionUser.userId);
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
