import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user?: {
      userId?: string;
      isAdmin?: boolean;
      rewardPoints?: number;
    } & DefaultSession['user'];
  }

  interface User {
    isAdmin?: boolean;
    rewardPoints?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId?: string;
    isAdmin?: boolean;
    rewardPoints?: number;
  }
}
