import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/config/database';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const MAX_PASSWORD_LENGTH = 128;

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

        const user = await User.findOne({ email: credentials.email }).select('+password');

        if (!user) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password as string);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: (user._id as { toString(): string }).toString(),
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
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
      }
      return session;
    },
  },
};
