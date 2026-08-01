import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/config/database';
import User, { type DemoType } from '@/models/User';
import AccountDeletionAudit from '@/models/AccountDeletionAudit';
import bcrypt from 'bcryptjs';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';
import { demoLoginInputSchema } from '@/lib/auth/demo-login-schema';
import { MAX_PASSWORD_LENGTH } from '@/lib/auth/password';
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  isSessionExpired,
  resolveRememberMe,
  resolveSessionExpiry,
} from '@/lib/auth/session-lifetime';

// Sign-in deliberately enforces MAX only — a too-long password would otherwise
// run a slow bcrypt.compare and become a DoS vector. MIN is enforced at
// register / password-change so a grandfathered short password from a pre-MIN
// signup still works here.
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000;
const DELETION_RECHECK_MS = 60_000;
// IP-keyed throttle on the credentials callback. The per-account lockout
// below only fires once a valid email is found, so without this an attacker
// scanning a list of unknown emails would hit zero throttle. 10/minute is
// loose enough that a real user fat-fingering their password through the
// 3-attempt account lockout won't trip it.
const SIGNIN_IP_MAX_PER_MIN = 10;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'example@example.com' },
        password: { label: 'Password', type: 'password', placeholder: 'Password' },
        rememberMe: { label: 'Keep me signed in', type: 'checkbox' },
      },
      async authorize(credentials, req) {
        // IP-level throttle backstop — the per-account lockout below only
        // fires once a valid email is found, so without this an attacker
        // scanning a list of unknown emails would face zero throttle.
        // Throwing surfaces the message back to the sign-in UI as `res.error`.
        const ip = clientIpFromHeaders(req?.headers ?? {});
        const ipLimit = rateLimit({
          key: `signin:${ip}`,
          max: SIGNIN_IP_MAX_PER_MIN,
          windowMs: 60_000,
        });
        if (!ipLimit.ok) {
          throw new Error('Too many sign-in attempts. Please try again in a minute.');
        }

        if (!credentials?.password || credentials.password.length > MAX_PASSWORD_LENGTH) {
          throw new Error('Invalid credentials');
        }
        // Defense-in-depth — `strictQuery: true` already makes Mongoose drop
        // undefined values, but a future `ignoreUndefined: true` flip on the
        // driver would turn `findOne({ email: undefined })` into `findOne({})`
        // and hand the attacker the first user in the collection.
        if (typeof credentials.email !== 'string' || credentials.email.length === 0) {
          throw new Error('Invalid credentials');
        }

        await connectDB();

        const email = credentials.email.toLowerCase().trim();
        const user = await User.findOne({ email }).select(
          '+password +failedLoginAttempts +lockoutUntil'
        );

        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockoutUntil.getTime() - Date.now()) / 60_000
          );
          // The phrase "Try again in N minute" is parsed by the login form to
          // drive its disable-and-countdown UI — keep that wording intact.
          throw new Error(
            `Too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
          );
        }

        const isValid = await bcrypt.compare(credentials.password, user.password as string);

        if (!isValid) {
          // An expired lockout starts the count over. The counter only reset
          // on a SUCCESSFUL sign-in, so once someone had been locked out, a
          // single wrong password an hour later took them from 3 straight back
          // to 4 and re-locked for the full duration — a real-user trap rather
          // than a defence, since an attacker gets the same three attempts per
          // window either way.
          const lockoutExpired =
            Boolean(user.lockoutUntil) && user.lockoutUntil!.getTime() <= Date.now();
          const attempts = (lockoutExpired ? 0 : (user.failedLoginAttempts ?? 0)) + 1;
          const update: Record<string, unknown> = { failedLoginAttempts: attempts };
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            update.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          } else if (lockoutExpired) {
            update.lockoutUntil = null;
          }
          await User.updateOne({ _id: user._id }, { $set: update });
          throw new Error('Invalid credentials');
        }

        // `lastActiveAt` powers the dormancy scan — every successful sign-in
        // counts as activity and clears any pending dormancy warning. The
        // dormancy_warned audit row stays on the record; the next scan picks
        // them back up only if they go inactive again.
        const dormancyWasWarned = Boolean(user.dormancyWarnedAt);
        const resetFields: Record<string, unknown> = {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastActiveAt: new Date(),
          dormancyWarnedAt: null,
        };

        // Sign-in into a soft-deleted account cancels the deletion request.
        // Use findOneAndUpdate with a `deletedAt` precondition so the purge
        // cron can't race us: if it deleted the user between `findOne` above
        // and the restore write here, the matched-count will be zero and we
        // refuse the sign-in. Without this guard a freshly-purged user would
        // still receive a valid JWT for a User document that no longer exists.
        if (user.deletedAt) {
          resetFields.deletedAt = null;
          resetFields.deletionScheduledFor = null;
          const restored = await User.findOneAndUpdate(
            { _id: user._id, deletedAt: { $ne: null } },
            { $set: resetFields },
            { new: true },
          );
          if (!restored) {
            // The cron purged this user between our read and write. Refuse.
            throw new Error('Invalid credentials');
          }
          await AccountDeletionAudit.create({
            userId: user._id,
            userEmailSnapshot: user.email,
            action: 'self_restore',
            performedBy: null,
          });
        } else {
          await User.updateOne({ _id: user._id }, { $set: resetFields });
        }

        // Cleared a dormancy warning by signing in — separate audit row so
        // the Login client can show a dormancy-specific welcome-back banner
        // and the admin audit trail records why the warning vanished.
        if (dormancyWasWarned) {
          await AccountDeletionAudit.create({
            userId: user._id,
            userEmailSnapshot: user.email,
            action: 'self_dormancy_cleared',
            performedBy: null,
          });
        }

        return {
          id: (user._id as { toString(): string }).toString(),
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          rewardPoints: (user.rewardPoints as number) ?? 0,
          isDemo: Boolean(user.isDemo),
          demoType: user.demoType as DemoType | undefined,
          // Only /login posts this. The other two callers of this provider —
          // Register's restore-and-sign-in and the checkout inline sign-in —
          // send nothing, and `resolveRememberMe` reads that silence as the
          // long lifetime those flows have always had.
          rememberMe: resolveRememberMe(credentials.rememberMe),
        };
      },
    }),
    // Portfolio demo sign-in. The client posts `{ demoType: 'customer' | 'admin' }`
    // via `signIn('demo', ...)` — no password is shipped. The provider looks up
    // the matching seeded account (created by scripts/seed.mjs and the
    // standalone scripts/seed-demo.mjs) and issues a session. A real account
    // missing the `isDemo: true` flag cannot sign in through this path even
    // if its document carries a stray `demoType` value, and a soft-deleted
    // demo account is refused the same way real accounts are.
    CredentialsProvider({
      id: 'demo',
      name: 'Demo',
      credentials: {
        demoType: { label: 'Demo type', type: 'text' },
      },
      async authorize(credentials, req) {
        // Same IP throttle the real credentials path uses — without it a bot
        // could spin up unlimited demo sessions and use the endpoint for load
        // or spam purposes. The demo account itself holds nothing sensitive,
        // but unthrottled session-token generation is its own abuse vector.
        const ip = clientIpFromHeaders(req?.headers ?? {});
        const ipLimit = rateLimit({
          key: `demo-signin:${ip}`,
          max: SIGNIN_IP_MAX_PER_MIN,
          windowMs: 60_000,
        });
        if (!ipLimit.ok) {
          throw new Error('Too many sign-in attempts. Please try again in a minute.');
        }

        const parsed = demoLoginInputSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? 'Invalid demo input');
        }
        const { demoType } = parsed.data;

        await connectDB();

        const user = await User.findOne({
          isDemo: true,
          demoType,
          deletedAt: null,
        });

        if (!user) {
          throw new Error('Demo account is not available');
        }

        return {
          id: (user._id as { toString(): string }).toString(),
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          rewardPoints: (user.rewardPoints as number) ?? 0,
          isDemo: true,
          demoType: user.demoType as DemoType | undefined,
          // Demo doors offer no "keep me signed in" choice, so they take the
          // shorter lifetime. A throwaway exploration session has no business
          // persisting for a month on a recruiter's machine, and the nightly
          // reset wipes what it was looking at anyway.
          rememberMe: false,
        };
      },
    }),
  ],
  session: {
    // Explicit rather than inherited so the ceiling is visible next to the
    // per-session deadlines that reference it. Same 30 days NextAuth defaults
    // to, so no existing session's cookie changes length.
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  callbacks: {
    // `session` (the update payload) is deliberately not destructured — the
    // update branch below re-reads the user instead of trusting it.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = Boolean(user.isAdmin);
        token.rewardPoints = (user.rewardPoints as number) ?? 0;
        token.isDemo = Boolean(user.isDemo);
        token.demoType = user.demoType;
        // Fresh sign-in just validated the user; skip the re-check until the
        // window expires.
        token.lastDeletionCheckAt = Date.now();
        // Stamped once, here. Deliberately not refreshed on later calls — the
        // deadline is absolute, so "keep me signed in" means a fixed 30 days
        // rather than 30 days of inactivity.
        token.sessionExpiresAt = resolveSessionExpiry(
          Boolean(user.rememberMe),
          Date.now(),
        );
      }

      // Past its deadline the token reads as logged-out everywhere, via the
      // same tombstone the soft-delete re-check below uses. The cookie itself
      // lives until its own max-age; NextAuth's JWT strategy gives a callback
      // no way to clear it early.
      if (isSessionExpired(token.sessionExpiresAt, Date.now())) {
        return { invalidated: true };
      }
      // Re-read from the database rather than trusting the update payload.
      // This used to copy `session.name` / `session.email` straight into the
      // token, so any signed-in user could rewrite their own token identity
      // from the console — unbounded strings into the session cookie, and a
      // `customer_email` on their Stripe checkout that was never theirs. The
      // client triggers this only after a profile save has already persisted,
      // so the stored values are the ones to reflect, and the extra read is
      // confined to that rare trigger.
      if (trigger === 'update' && token.sub) {
        await connectDB();
        const fresh = await User.findById(token.sub)
          .select('name email')
          .lean<{ name?: string; email?: string } | null>();
        if (fresh) {
          if (fresh.name) token.name = fresh.name;
          if (fresh.email) token.email = fresh.email;
        }
      }

      // Periodically revalidate the user against soft-deletion state. An
      // admin soft-delete (or a hard-purge from the cron) needs to invalidate
      // the customer's stale JWT cookie within a bounded window rather than
      // waiting for the cookie itself to expire. Cached for a minute to keep
      // the per-request DB cost negligible. Admin and demo accounts skip the
      // check — admins can never be soft-deleted (the routes refuse) and demo
      // accounts are guarded the same way (Phase B), so the per-minute DB hit
      // would be pure overhead.
      if (token.userId && !token.isAdmin && !token.isDemo) {
        const last = token.lastDeletionCheckAt ?? 0;
        if (Date.now() - last > DELETION_RECHECK_MS) {
          try {
            await connectDB();
            const current = await User.findById(token.userId)
              .select('deletedAt')
              .lean<{ deletedAt?: Date | null } | null>();
            // Missing user → hard-purged. Soft-deleted user → tombstone it;
            // sign-in restore is the only path that should re-validate them.
            if (!current || current.deletedAt) {
              return { invalidated: true };
            }
            token.lastDeletionCheckAt = Date.now();
          } catch (error) {
            // Re-check failure leaves the existing token in place. Better to
            // let a momentary DB blip pass than to log every user out. Bump
            // the timestamp anyway so a sustained outage doesn't have every
            // request retry immediately and swamp Mongo with more queries.
            // A soft-deleted user briefly retaining access during a real DB
            // outage is the same SLA as the happy-path 60-second window.
            token.lastDeletionCheckAt = Date.now();
            console.error('[authOptions.jwt] deletion re-check failed', error);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Tombstoned token → return a null-equivalent session so useSession()
      // resolves to unauthenticated and server reads via getServerSession see
      // no user. The cookie persists on the client until the next sign-in,
      // but it's empty of identity.
      if (token.invalidated) {
        return { ...session, user: undefined } as typeof session;
      }
      if (session.user) {
        session.user.userId = token.userId;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.rewardPoints = token.rewardPoints ?? 0;
        session.user.isDemo = Boolean(token.isDemo);
        session.user.demoType = token.demoType;
      }
      return session;
    },
  },
};
