import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user?: {
      userId?: string;
      isAdmin?: boolean;
      rewardPoints?: number;
      isDemo?: boolean;
      demoType?: 'customer' | 'admin';
    } & DefaultSession['user'];
  }

  interface User {
    isAdmin?: boolean;
    rewardPoints?: number;
    isDemo?: boolean;
    demoType?: 'customer' | 'admin';
    // Whether the sign-in form's "Keep me signed in" box was ticked. Only
    // exists to carry the answer from `authorize` (which sees the credentials)
    // to the jwt callback (which sets the token's deadline but never sees
    // them). Never persisted and never read off the session.
    rememberMe?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId?: string;
    isAdmin?: boolean;
    rewardPoints?: number;
    isDemo?: boolean;
    demoType?: 'customer' | 'admin';
    // Last unix-ms timestamp the token was revalidated against the User doc's
    // `deletedAt`. The jwt callback re-checks the DB roughly once a minute so
    // an admin soft-delete kicks a still-signed-in customer within the same
    // window instead of waiting for the cookie to expire.
    lastDeletionCheckAt?: number;
    // Absolute unix-ms deadline for this session, stamped once at sign-in from
    // the "Keep me signed in" choice. Past it, the jwt callback tombstones the
    // token the same way the soft-delete re-check does. Absent on tokens
    // issued before session lifetimes were wired up.
    sessionExpiresAt?: number;
    // Tombstone — set when the re-check finds the user soft-deleted or gone.
    // The session callback returns null when this is true, so `useSession()`
    // resolves to "unauthenticated" on the client and protected server reads
    // 401. NextAuth's JWT strategy can't expire the cookie from a callback,
    // but a tombstoned token reads as logged-out everywhere that matters.
    invalidated?: boolean;
  }
}
