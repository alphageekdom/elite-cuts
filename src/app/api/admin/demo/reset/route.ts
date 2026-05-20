import { NextResponse, type NextRequest } from 'next/server';

import { withAdmin } from '@/lib/api-handler';
import { getSessionUser } from '@/lib/getSessionUser';
import { isDemoAdmin } from '@/lib/auth/demo-permissions';
import { resetDemoCustomerState } from '@/lib/demo/reset';

export const dynamic = 'force-dynamic';

// Session-authed sibling of `/api/cron/reset-demo`. Powers the "Reset demo
// data" button on admin Settings → General. Same orchestrator as the cron
// path so the two can't drift on what they wipe.
//
// A demo admin is explicitly refused — the demo admin is itself a fixture,
// and letting it trigger the reset would be a way to nuke a recruiter's
// in-progress demo session from inside the demo. Phase B's `isDemoAdmin`
// helper is the gate.
const handler = withAdmin(async (_req: NextRequest) => {
  const sessionUser = await getSessionUser();
  if (isDemoAdmin(sessionUser?.user)) {
    return NextResponse.json(
      { message: 'Demo admins cannot trigger the demo data reset.' },
      { status: 403 },
    );
  }

  try {
    const counts = await resetDemoCustomerState();
    return NextResponse.json({
      data: counts,
      message: 'Demo customer state reset',
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
