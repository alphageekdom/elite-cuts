import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/config/database';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const MAX_PASSWORD_LENGTH = 128;
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'example@example.com' },
        password: { label: 'Password', type: 'password', placeholder: 'Password' },
      },
      async authorize(credentials) {
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

        await User.updateOne(
          { _id: user._id },
          { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
        );

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
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name as string;
        if (session.email) token.email = session.email as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.rewardPoints = token.rewardPoints ?? 0;
      }
      return session;
    },
  },
};
