import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/getSessionUser';
import {
  parseObjectId,
  withAdminNonDemo,
  type RouteContext,
} from '@/lib/api-handler';
import { EMAIL_RE } from '@/lib/validation';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';
import { clearDormancyWarning, hardDeleteUser, restoreUser, softDeleteUser } from '@/lib/accountDeletion';
import { refuseDemoActor, refuseDemoTarget } from '@/lib/auth/demo-responses';
import {
  PASSWORD_LENGTH_MESSAGE,
  isPasswordLengthValid,
} from '@/lib/auth/password';

type Ctx = RouteContext<{ id: string }>;

// IP-keyed throttle on the password-change branch below. The credentials
// `authorize()` per-account lockout doesn't cover this path, so an
// authenticated attacker who lost their password (or stole a session) could
// otherwise brute-force currentPassword against the bcrypt compare unlimited.
const PASSWORD_CHANGE_IP_MAX_PER_MIN = 5;

// GET /api/users/:id — self or admin only
export const GET = async (_request: NextRequest, { params }: Ctx) => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    if (sessionUser.userId !== id && !sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // `adminNote` is admin-private. The customer self-read branch also strips
    // `stripeCustomerId` (parallel to the order self-read's Stripe-id strip)
    // and the internal dormancy bookkeeping fields, none of which any
    // customer-facing surface reads back via this endpoint.
    const projection = sessionUser.user?.isAdmin
      ? '-password'
      : '-password -adminNote -stripeCustomerId -dormancyWarnedAt -lastActiveAt';
    const user = await User.findById(id).select(projection);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('[users/:id GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// PUT /api/users/:id — profile info or password update, self only
export const PUT = async (request: NextRequest, { params }: Ctx) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;
    const isAdmin = sessionUser.user?.isAdmin ?? false;

    if (sessionUser.userId !== id && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Demo customer: refuse identity-bearing self-edits (email, password,
    // profile-info). The whole profile-info branch goes since the existing UI
    // submits name/email/phone together — splitting per-field would give a
    // confusing partial-success on the demo. Phase B's spec.
    const actorBlocked = refuseDemoActor(sessionUser.user);
    if (actorBlocked && sessionUser.userId === id) return actorBlocked;

    await connectDB();

    // Refuse any admin-driven mutation of a demo account (regardless of who's
    // calling). Looking the target up here lets every branch below reuse it.
    if (isAdmin && sessionUser.userId !== id) {
      const target = await User.findById(id).select('isDemo isAdmin');
      const targetBlocked = refuseDemoTarget(target);
      if (targetBlocked) return targetBlocked;
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      adminNote?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    const { name, email, phone, adminNote, currentPassword, newPassword } = body;

    // Admin note update — admin only
    if (adminNote !== undefined) {
      if (!isAdmin) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      await User.findByIdAndUpdate(id, { $set: { adminNote: adminNote.trim() } });
      return NextResponse.json({ message: 'Note updated' });
    }

    // Profile info update (name / email / phone) — also allowed for admin on any user
    if (name !== undefined || email !== undefined || phone !== undefined) {
      if (name !== undefined) {
        const trimmed = name.trim();
        if (!trimmed) return NextResponse.json({ message: 'Name is required' }, { status: 400 });
        if (trimmed.length > 80) return NextResponse.json({ message: 'Name is too long' }, { status: 400 });
      }

      if (email !== undefined) {
        if (!EMAIL_RE.test(email)) {
          return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
        }
        const conflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
        if (conflict) {
          return NextResponse.json({ message: 'Email is already in use' }, { status: 409 });
        }
      }

      if (phone !== undefined && phone !== '') {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
          return NextResponse.json(
            { message: 'Phone number must have at least 10 digits' },
            { status: 400 },
          );
        }
      }

      const updateFields: Record<string, string> = {};
      if (name !== undefined) updateFields.name = name.trim();
      if (email !== undefined) updateFields.email = email.toLowerCase().trim();
      if (phone !== undefined) updateFields.phone = phone.trim();

      await User.findByIdAndUpdate(id, { $set: updateFields }, { runValidators: true });
      return NextResponse.json({ message: 'Profile updated successfully' });
    }

    // Password update — self only, not allowed via admin path
    if (isAdmin && sessionUser.userId !== id) {
      return NextResponse.json({ message: 'Admins cannot change another user\'s password' }, { status: 403 });
    }

    const ip = clientIpFromHeaders(request.headers);
    const limit = rateLimit({
      key: `passwd-change:${ip}`,
      max: PASSWORD_CHANGE_IP_MAX_PER_MIN,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { message: 'Too many requests, please try again shortly' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
      );
    }

    if (!newPassword) {
      return NextResponse.json({ message: 'New password is required' }, { status: 400 });
    }

    if (!isPasswordLengthValid(newPassword)) {
      return NextResponse.json(
        { message: PASSWORD_LENGTH_MESSAGE },
        { status: 400 },
      );
    }

    const user = await User.findById(id).select('+password');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json({ message: 'Current password is required' }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(id, { $set: { password: hashedPassword } });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[users/:id PUT]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// DELETE /api/users/:id — admin-initiated deletion.
//
// Body shape (all optional, JSON): { reason?: string; immediate?: boolean }
//   - immediate=false (default): 30-day soft delete, customer can self-restore
//     by signing in. Reason is recorded in the audit log if supplied.
//   - immediate=true: synchronous hard delete with full cascade. Reason is
//     required (abuse cases, spam) and the request 400s without it.
//
// Refuses to delete admin accounts or the requesting admin's own row.
export const DELETE = withAdminNonDemo<{ id: string }>(async (request, ctx, performedBy) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;
    if (id === performedBy) {
      return NextResponse.json({ message: 'Admins cannot delete themselves' }, { status: 403 });
    }

    // Empty / malformed body falls back to defaults (soft delete, no reason).
    // The inline `.catch(() => ({}))` already converts a JSON-parse failure
    // into an empty object, so no outer try/catch is needed here.
    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
      immediate?: boolean;
    };
    const immediate = Boolean(body?.immediate);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : undefined;

    const target = await User.findById(id).select('isAdmin isDemo');
    if (!target) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const targetBlocked = refuseDemoTarget(target);
    if (targetBlocked) return targetBlocked;
    if (target.isAdmin) {
      return NextResponse.json({ message: 'Admin accounts cannot be deleted' }, { status: 403 });
    }

    if (immediate) {
      if (!reason) {
        return NextResponse.json(
          { message: 'Reason is required for immediate hard delete' },
          { status: 400 },
        );
      }
      await hardDeleteUser(id, { actor: 'admin', performedBy, reason });
      return NextResponse.json({ message: 'User permanently deleted' });
    }

    const { deletionScheduledFor } = await softDeleteUser(id, {
      actor: 'admin',
      performedBy,
      reason,
    });
    return NextResponse.json({
      message: 'User scheduled for deletion',
      deletionScheduledFor: deletionScheduledFor.toISOString(),
    });
  } catch (error) {
    console.error('[users/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// POST /api/users/:id/restore is handled in the nested route file; this file
// exposes one additional admin-only verb on this resource — cancel deletion —
// through PATCH so the customer detail drawer's "Cancel deletion" action has
// a single endpoint to hit without a deeper nested route.
export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx, performedBy) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      value?: unknown;
    };

    // Refuse either lifecycle action against a demo target — demo accounts
    // can't be soft-deleted or dormancy-warned in the first place (Phase B
    // guards + dormancy-scan exclusion), so any cancel-* against them is
    // either stale state or a tampered call. Either way, refuse.
    const target = await User.findById(id).select('isDemo');
    const targetBlocked = refuseDemoTarget(target);
    if (targetBlocked) return targetBlocked;

    if (body?.action === 'cancel_deletion') {
      await restoreUser(id, { actor: 'admin', performedBy });
      return NextResponse.json({ message: 'Deletion cancelled' });
    }

    if (body?.action === 'cancel_dormancy') {
      const result = await clearDormancyWarning(id, { actor: 'admin', performedBy });
      return NextResponse.json({
        message: result.wasWarned
          ? 'Dormancy warning cleared'
          : 'No dormancy warning was set',
      });
    }

    return NextResponse.json({ message: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[users/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
