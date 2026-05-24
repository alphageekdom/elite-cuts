import { NextResponse, type NextRequest } from 'next/server';
import type { SortOrder } from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import User from '@/models/User';
import { withAdmin, withAdminNonDemo, parsePagination } from '@/lib/api-handler';
import { EMAIL_RE } from '@/lib/validation';

const ALLOWED_USER_SORT_FIELDS = new Set(['_id', 'name', 'email', 'createdAt', 'role']);

export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const params = request.nextUrl.searchParams;
    const { skip, pageSize } = parsePagination(params, { pageSize: 6 });
    const rawSortField = params.get('sortField') ?? '_id';
    const sortField = ALLOWED_USER_SORT_FIELDS.has(rawSortField) ? rawSortField : '_id';
    const sortOrder: SortOrder = params.get('sortOrder') === 'desc' ? -1 : 1;
    const sort: Record<string, SortOrder> = { [sortField]: sortOrder };

    // Whitelist the fields a list consumer (admin dashboard, future
    // CLI/mobile clients) actually renders. The old `-password` shape
    // returned everything else — stripeCustomerId, pointsHistory, full
    // addresses, failedLoginAttempts, lockoutUntil — on every list row.
    const LIST_PROJECTION = [
      'name',
      'email',
      'phone',
      'createdAt',
      'addresses',
      'savedCuts',
      'adminNote',
      'deletedAt',
      'deletionScheduledFor',
      'dormancyWarnedAt',
      'lastActiveAt',
      'isDemo',
      'isAdmin',
    ].join(' ');

    const [total, users] = await Promise.all([
      User.countDocuments({}),
      User.find({}).sort(sort).skip(skip).limit(pageSize).select(LIST_PROJECTION),
    ]);

    return NextResponse.json({ total, users });
  } catch (error) {
    console.error('[users GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// Admin-only customer creation. No password is collected on the form — the
// server generates a one-time temporary password, hashes it, and returns the
// plaintext to the admin once so they can hand it to the customer. The
// customer changes it on first sign-in. Self-service registration still lives
// at /api/auth/register and is untouched.
export const POST = withAdminNonDemo(async (request: NextRequest) => {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      adminNote?: string;
    };

    const name = body.name?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const phone = body.phone?.trim() ?? '';
    const adminNote = body.adminNote?.trim() ?? '';

    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name and email are required' },
        { status: 400 },
      );
    }
    if (name.length > 80) {
      return NextResponse.json(
        { message: 'Name must be 80 characters or fewer' },
        { status: 400 },
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }
    if (adminNote.length > 1000) {
      return NextResponse.json(
        { message: 'Note must be 1000 characters or fewer' },
        { status: 400 },
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: 'A user with that email already exists' },
        { status: 409 },
      );
    }

    const tempPassword = randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newUser = await new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || undefined,
      adminNote,
      lastActiveAt: new Date(),
    }).save();

    return NextResponse.json(
      {
        message: 'Customer created',
        tempPassword,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone ?? '',
          adminNote: newUser.adminNote ?? '',
          createdAt: newUser.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[users POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
