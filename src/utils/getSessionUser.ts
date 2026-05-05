import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/utils/authOptions';

type SessionUser = {
  user: NonNullable<Session['user']>;
  email: string | null | undefined;
  userId: string | undefined;
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) return null;

    const { user } = session;
    return {
      user,
      email: user.email,
      userId: user.userId,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
