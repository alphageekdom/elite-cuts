import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

import connectDB from '@/config/database';
import User from '@/models/User';
import { EMAIL_RE } from '@/lib/validation';
import { claimGuestOrdersForUser } from '@/lib/claimGuestOrders';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';
import {
  PASSWORD_LENGTH_MESSAGE,
  isPasswordLengthValid,
} from '@/lib/auth/password';

// Per-IP cap. Register is high-value abuse surface (mass account creation,
// bcrypt-compare CPU drain, password-spray against the soft-delete restore
// signal Phase B2 gated on a password match), so we keep this tight.
const REGISTER_MAX = 5;
const REGISTER_WINDOW_MS = 60_000;

export const POST = async (request: NextRequest) => {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const limit = rateLimit({
      key: `register:${ip}`,
      max: REGISTER_MAX,
      windowMs: REGISTER_WINDOW_MS,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { message: 'Too many requests, please try again shortly' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
      );
    }

    await connectDB();

    const { name, email, password, confirmPassword } = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 },
      );
    }

    if (name.trim().length > 80) {
      return NextResponse.json(
        { message: 'Name must be 80 characters or fewer' },
        { status: 400 },
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }

    if (!isPasswordLengthValid(password)) {
      return NextResponse.json(
        { message: PASSWORD_LENGTH_MESSAGE },
        { status: 400 },
      );
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      return NextResponse.json(
        { message: 'Passwords do not match' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Single generic 409 shape for every collision case. Earlier we ran
    // `bcrypt.compare` against a soft-deleted account's hash and surfaced
    // `accountState: 'soft_deleted'` only on a match — that turned this
    // endpoint into a password-verification oracle (attacker learns whether
    // their guess matches a soft-deleted account by the response shape).
    // The restore path is handled by `authorize()` on /login, so the
    // register endpoint never needs to disclose soft-delete state here.
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id');

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      // Account creation is itself activity — stamping `lastActiveAt` here
      // means the dormancy scan won't pick the user up on day one before
      // they've had a chance to sign in for the first time. The dormancy
      // job's backfill skip-condition (`lastActiveAt: null`) no longer
      // sweeps brand-new users into its query.
      lastActiveAt: new Date(),
    }).save();

    // Attach any prior guest orders placed with this email to the new
    // account. Fire-and-forget: a claim failure logs but never breaks
    // registration — the orders stay claimable later if needed. Log the
    // count so it's visible in production whether the feature is firing.
    try {
      const claim = await claimGuestOrdersForUser(newUser._id, normalizedEmail);
      if (claim.modifiedCount > 0) {
        console.log(
          `[register] claimed ${claim.modifiedCount} prior guest order(s) for ${normalizedEmail}`,
        );
      }
    } catch (claimError) {
      console.error('[register] claim guest orders failed', claimError);
    }

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }
};
