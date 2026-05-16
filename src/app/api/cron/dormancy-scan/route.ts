import { NextResponse, type NextRequest } from 'next/server';
import { runDormancyScanJob } from '@/jobs/dormancyScan';

export const dynamic = 'force-dynamic';

// Runs the dormancy scan: warn-pass + soft-delete-pass.
//
// Vercel Cron invokes scheduled paths with GET and `Authorization: Bearer
// <CRON_SECRET>` — so GET is the production entry point. POST mirrors it for
// ad-hoc admin / test triggering. Mirrors the purge-deleted-accounts route's
// shape exactly.
async function runDormancy(request: NextRequest) {
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
    const result = await runDormancyScanJob();
    return NextResponse.json({ message: 'Dormancy scan complete', ...result });
  } catch (error) {
    console.error('[cron/dormancy-scan]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}

export const GET = runDormancy;
export const POST = runDormancy;
