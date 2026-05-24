import { NextResponse, type NextRequest } from 'next/server';

import { withAdminNonDemo } from '@/lib/api-handler';
import { resetDemoData } from '@/lib/demo/reset';

export const dynamic = 'force-dynamic';

// Session-authed sibling of `/api/cron/reset-demo`. Powers the "Reset demo
// data" button on admin Settings → General. Same orchestrator as the cron
// path so the two can't drift on what they wipe. `withAdminNonDemo` refuses
// demo-admin sessions — letting the demo admin trigger this would be a way
// to nuke a recruiter's in-progress demo session from inside the demo.
const handler = withAdminNonDemo(async (_req: NextRequest) => {
  try {
    const counts = await resetDemoData();
    return NextResponse.json({
      data: counts,
      message: 'Demo data reset',
    });
  } catch (error) {
    console.error('[admin/demo/reset POST]', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 },
    );
  }
});

export const POST = handler;
