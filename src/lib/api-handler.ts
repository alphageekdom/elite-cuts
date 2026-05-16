import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import { getSessionUser } from '@/utils/getSessionUser';

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;
// Handler receives (req, ctx, userId) — ctx is the Next.js route context (params, etc.).
// Functions with fewer params are assignable in TypeScript, so handlers that
// don't need ctx or userId can simply omit them.
type AdminHandler = (req: NextRequest, ctx: unknown, userId: string) => Promise<NextResponse>;
type AuthHandler  = (req: NextRequest, ctx: unknown, userId: string) => Promise<NextResponse>;

export const unauthorized = () =>
  NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

/**
 * Wraps a route handler with `connectDB` + admin auth check.
 * Passes the route context (params) and verified userId to the handler so it
 * does not need to call connectDB() or getSessionUser() again.
 */
export function withAdmin(handler: AdminHandler): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    if (!sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    return handler(req, ctx, sessionUser.userId);
  };
}

/**
 * Wraps a route handler with `connectDB` + session auth check.
 * Passes the verified userId as the third argument so the handler does not
 * need to call connectDB() or getSessionUser() again.
 */
export function withAuth(handler: AuthHandler): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    return handler(req, ctx, sessionUser.userId);
  };
}

/**
 * Wraps a cron-route handler with the standard `Authorization: Bearer
 * <CRON_SECRET>` gate. Mirrors Vercel Cron's default invocation shape: it
 * fires GETs with the bearer header, so the cron routes export both GET and
 * POST pointing at the same handler (POST kept for ad-hoc admin triggering).
 *
 * Returns 503 when `CRON_SECRET` is unset (misconfigured deploy), 401 on a
 * missing/incorrect header, and forwards the job's result body verbatim
 * under `{ message: successMessage, ...result }` on success.
 */
type CronJob<TResult> = () => Promise<TResult>;
export function withCronSecret<TResult extends Record<string, unknown>>(
  job: CronJob<TResult>,
  successMessage: string,
): RouteHandler {
  return async (request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ message: 'Cron secret not configured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization') ?? '';
    const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (provided !== secret) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    try {
      const result = await job();
      return NextResponse.json({ message: successMessage, ...result });
    } catch (error) {
      console.error('[cron]', error);
      return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
    }
  };
}

/**
 * Parses `page` and `pageSize` from URL search params with safe defaults and a
 * 200-item hard cap on pageSize to prevent unbounded DB queries.
 */
export function parsePagination(
  params: URLSearchParams,
  defaults: { pageSize?: number } = {},
): { page: number; pageSize: number; skip: number } {
  const { pageSize: defaultPageSize = 10 } = defaults;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(params.get('pageSize') ?? String(defaultPageSize), 10) || defaultPageSize),
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}
