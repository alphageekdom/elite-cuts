import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import User from '@/models/User';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/check-email — driver for the register page's "Restore your
// account" swap. Returns exactly two shapes:
//
//   { status: 'soft_deleted', deletionScheduledFor }
//   { status: 'ok' }
//
// Active accounts and addresses with no account both return `ok` — the
// duplicate-email check still happens at submit time via the register route's
// 409, so we don't gain anything by distinguishing them here, and *not*
// distinguishing them prevents the endpoint from doubling as an account-
// existence oracle for anyone who can POST.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.toLowerCase().trim();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ status: 'ok' });
    }

    await connectDB();

    const user = await User.findOne({ email })
      .select('deletedAt deletionScheduledFor')
      .lean<{ deletedAt?: Date | null; deletionScheduledFor?: Date | null }>();

    if (user?.deletedAt) {
      return NextResponse.json({
        status: 'soft_deleted',
        deletionScheduledFor: user.deletionScheduledFor?.toISOString() ?? null,
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[auth/check-email POST]', error);
    return NextResponse.json({ status: 'ok' });
  }
}
