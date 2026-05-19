import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/config/database';
import User from '@/models/User';
import AccountDeletionAudit from '@/models/AccountDeletionAudit';
import bcrypt from 'bcryptjs';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';

const MAX_PASSWORD_LENGTH = 128;
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

        await connectDB();

        const email = credentials.email?.toLowerCase().trim();
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
          const attempts = (user.failedLoginAttempts ?? 0) + 1;
          const update: Record<string, unknown> = { failedLoginAttempts: attempts };
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            update.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
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
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/error',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = Boolean(user.isAdmin);
        token.rewardPoints = (user.rewardPoints as number) ?? 0;
        // Fresh sign-in just validated the user; skip the re-check until the
        // window expires.
        token.lastDeletionCheckAt = Date.now();
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name as string;
        if (session.email) token.email = session.email as string;
      }

      // Periodically revalidate the user against soft-deletion state. An
      // admin soft-delete (or a hard-purge from the cron) needs to invalidate
      // the customer's stale JWT cookie within a bounded window rather than
      // waiting for the cookie itself to expire. Cached for a minute to keep
      // the per-request DB cost negligible. Admin accounts skip the check —
      // they can never be soft-deleted (the routes refuse), so the per-minute
      // DB hit would be pure overhead.
      if (token.userId && !token.isAdmin) {
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
      }
      return session;
    },
  },
};
