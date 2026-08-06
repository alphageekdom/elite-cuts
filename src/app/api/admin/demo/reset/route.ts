import { NextResponse, type NextRequest } from 'next/server';

import { withAdminNonDemo } from '@/lib/api-handler';
import { resetDemoData, DemoResetInProgressError } from '@/lib/demo/reset';

export const dynamic = 'force-dynamic';

// Same ceiling as the cron sibling, for the same reason — this route runs the
// identical ~110-round-trip job, and it is also the manual RECOVERY path when
// a nightly run fails, so it is the one invocation that must not time out
// into exactly the partial state it exists to repair.
export const maxDuration = 300;

// Session-authed sibling of `/api/cron/reset-demo`. Powers the "Reset demo
// data" button on admin Settings → General. Same orchestrator as the cron
// path so the two can't drift on what they wipe. `withAdminNonDemo` refuses
// demo-admin sessions — letting the demo admin trigger this would be a way
// to nuke a recruiter's in-progress demo session from inside the demo.
const handler = withAdminNonDemo(async (_req: NextRequest) => {
  try {
    const counts = await resetDemoData();
    // Stays a 200: the wipe and restore did run, and the admin needs the counts.
    // A 500 would send the card into its `!res.ok` branch, which throws `data`
    // away — the admin would lose the counts and be told nothing happened.
    //
    // The message is API hygiene, NOT what the admin reads. `DemoResetCard` is
    // the only consumer and it ignores this string on the success path,
    // building its own summary from `data` — the admin-facing warning lives
    // there. This exists so the payload does not claim a clean "Demo data
    // reset" while `data` reports failures, for anything reading the endpoint
    // directly (a log, a curl, a future consumer).
    return NextResponse.json({
      data: counts,
      message:
        counts.ratingRecomputeFailures > 0
          ? 'Demo data reset, but some ratings could not be recomputed'
          : 'Demo data reset',
    });
  } catch (error) {
    // The advisory lock's refusal is a state, not a malfunction — the admin
    // double-clicked, has two tabs open, or raced the nightly cron. Name it
    // instead of hiding it behind the generic 500.
    if (error instanceof DemoResetInProgressError) {
      return NextResponse.json(
        { message: 'A demo reset is already running — give it a moment and try again.' },
        { status: 409 },
      );
    }
    console.error('[admin/demo/reset POST]', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 },
    );
  }
});

export const POST = handler;
