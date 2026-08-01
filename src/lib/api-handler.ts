import { timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import type { ZodError } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import { getSessionUser } from '@/lib/auth/session';
import { isDemoAdmin } from '@/lib/auth/demo-permissions';

// `ctx` is Next.js's per-request route context — `{ params: Promise<...> }` for
// dynamic segments. Wrappers are generic over `TParams` so dynamic-segment
// routes get a typed `ctx.params` without an inline `ctx as RouteContext` cast
// at every callsite. Non-dynamic routes leave the type parameter as its
// default (an empty object) and ignore `ctx`.
export type RouteContext<TParams = Record<string, string>> = {
  params: Promise<TParams>;
};

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

// Handler receives (req, ctx, userId) — ctx is the Next.js route context
// (params, etc.). Functions with fewer params are assignable in TypeScript,
// so handlers that don't need ctx or userId can simply omit them. The wrapper
// signatures below pass the runtime ctx through as `RouteContext<TParams>`;
// at the wrapper boundary `ctx` arrives as `unknown` because Next.js doesn't
// give us a typed handle on the dynamic-segment shape.
type AdminHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<TParams>,
  userId: string,
) => Promise<NextResponse>;
type AuthHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<TParams>,
  userId: string,
) => Promise<NextResponse>;

export const unauthorized = () =>
  NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

/**
 * Wraps a route handler with `connectDB` + admin auth check.
 * Passes the route context (params) and verified userId to the handler so it
 * does not need to call connectDB() or getSessionUser() again.
 */
export function withAdmin<TParams = Record<string, string>>(
  handler: AdminHandler<TParams>,
): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    if (!sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    return handler(req, ctx as RouteContext<TParams>, sessionUser.userId);
  };
}

/**
 * Same as `withAdmin` but additionally refuses demo-admin sessions with a
 * 403. Use this on every admin *mutation* that touches shop-wide state —
 * settings, catalog, orders, schedule, etc. — so a recruiter signed in as the
 * seeded demo admin can browse the dashboards without being able to change
 * what the next visitor sees. Read-only `GET` admin routes can stay on plain
 * `withAdmin`.
 */
export function withAdminNonDemo<TParams = Record<string, string>>(
  handler: AdminHandler<TParams>,
): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    if (!sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }
    if (isDemoAdmin(sessionUser.user)) {
      return NextResponse.json(
        { message: 'This action is disabled for demo accounts.' },
        { status: 403 },
      );
    }

    return handler(req, ctx as RouteContext<TParams>, sessionUser.userId);
  };
}

/**
 * Wraps a route handler with `connectDB` + session auth check.
 * Passes the verified userId as the third argument so the handler does not
 * need to call connectDB() or getSessionUser() again.
 */
export function withAuth<TParams = Record<string, string>>(
  handler: AuthHandler<TParams>,
): RouteHandler {
  return async (req, ctx) => {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    return handler(req, ctx as RouteContext<TParams>, sessionUser.userId);
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
/**
 * Wraps a scheduled job behind the shared bearer gate.
 *
 * `opts.failureCount` is how a job that collects per-item failures and keeps
 * going tells the wrapper the run was not clean. Jobs that either succeed or
 * throw outright (the demo reset) omit it. Reading a conventional key off the
 * result was the alternative and was rejected — the job knows what a failure
 * means, the generic wrapper does not.
 */
export function withCronSecret<TResult extends Record<string, unknown>>(
  job: CronJob<TResult>,
  successMessage: string,
  opts?: { failureCount?: (result: TResult) => number },
): RouteHandler {
  return async (request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ message: 'Cron secret not configured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization') ?? '';
    const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
    // Constant-time compare: `===` short-circuits on the first mismatched
    // byte, which leaks how many leading bytes of the secret an attacker
    // got right. timingSafeEqual costs the same regardless of where (or
    // whether) the mismatch is. The length pre-check is necessary because
    // the Node API throws on mismatched buffer lengths — we accept the
    // tiny "secret is N bytes" leak (the env-configured length is fixed
    // per deploy) in exchange for closing the per-byte timing signal.
    const providedBuf = Buffer.from(provided);
    const secretBuf = Buffer.from(secret);
    const ok =
      providedBuf.length === secretBuf.length &&
      timingSafeEqual(providedBuf, secretBuf);
    if (!ok) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    // Tagged with the route path so a log triage can tell the three schedules
    // apart. The wrapper is shared, so a bare '[cron]' left a 500 unattributable
    // without correlating timestamps against vercel.json.
    const tag = `[cron ${request.nextUrl.pathname}]`;
    try {
      const result = await job();
      const failed = opts?.failureCount?.(result) ?? 0;
      if (failed > 0) {
        // Deliberately a 500, not a 207. These jobs collect per-item failures
        // and continue, so a run where every single user failed used to answer
        // 200 with the counts buried in the body — indistinguishable, in the
        // cron log and to any status-based monitor, from a clean run. 207 is
        // still 2xx and would read as green in exactly the same way. The body
        // keeps the counts so the detail is there once someone looks.
        console.error(`${tag} completed with ${failed} failure(s)`);
        return NextResponse.json(
          { message: `${successMessage} — ${failed} failure(s)`, ...result },
          { status: 500 },
        );
      }
      return NextResponse.json({ message: successMessage, ...result });
    } catch (error) {
      console.error(tag, error);
      return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
    }
  };
}

/**
 * Validates a candidate Mongo ObjectId. Returns a 404 response when the id is
 * malformed, or `null` when it's a valid ObjectId — the canonical shape every
 * `[id]` route used to inline. Sample usage:
 *
 *   const invalid = parseObjectId(id);
 *   if (invalid) return invalid;
 *   // …continue using `id`…
 */
export function parseObjectId(id: string): NextResponse | null {
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  return null;
}

/**
 * Standard Zod-error → 400 response. Picks the first issue message off the
 * error for the customer-facing toast and falls back to the supplied default
 * when the issue list is unexpectedly empty.
 */
export function zodBadRequest(error: ZodError, fallback = 'Invalid input'): NextResponse {
  return NextResponse.json(
    { message: error.issues[0]?.message ?? fallback },
    { status: 400 },
  );
}

/**
 * Returns a Partial<T> containing only the keys whose values are not
 * `undefined`. Designed for building Mongoose `$set` payloads off a parsed
 * Zod object so optional fields don't accidentally get cleared.
 */
export function pickDefined<T extends object>(
  source: Partial<T>,
  keys: readonly (keyof T)[],
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
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
