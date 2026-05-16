import { NextResponse, type NextRequest } from 'next/server';
import { runPurgeDeletedAccountsJob } from '@/jobs/purgeDeletedAccounts';

export const dynamic = 'force-dynamic';

// Runs the hard-delete cascade for every soft-deleted account whose 30-day
// grace has elapsed.
//
// Vercel Cron invokes scheduled paths with **GET** and the
// `Authorization: Bearer <CRON_SECRET>` header — so the GET handler is the
// production entry point. POST mirrors it for ad-hoc admin / test triggering
// (e.g., a future "run purge now" button).
//
// If `CRON_SECRET` is unset (local dev) the route 503s so a misconfigured
// deployment can't run the cascade unauthenticated.
async function runPurge(request: NextRequest) {
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
    const result = await runPurgeDeletedAccountsJob();
    return NextResponse.json({ message: 'Purge complete', ...result });
  } catch (error) {
    console.error('[cron/purge-deleted-accounts]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}

export const GET = runPurge;
export const POST = runPurge;
