'use client';

import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

export type DemoType = 'customer' | 'admin';

// Where each demo session lands after sign-in. Customer goes to the catalog
// (the surface their experience is built around); admin goes to the dashboard
// home (the codebase's actual admin entry point — there is no `/admin` route).
const DEMO_REDIRECT: Record<DemoType, string> = {
  customer: '/products',
  admin: '/dashboard',
};

// Shared demo sign-in handler used by the /demo page cards and the login
// page's demo buttons. Calls NextAuth's `demo` credentials provider and
// hard-navigates on success so the session cookie is present on the first
// request of the destination page (avoids a one-frame logged-out flash in
// the navbar).
//
// Returns `true` on success (and triggers a navigation). Returns `false` on
// failure (after toasting the error) so callers can clear their pending UI.
export async function startDemoSession(demoType: DemoType): Promise<boolean> {
  try {
    const callbackUrl = DEMO_REDIRECT[demoType];
    const res = await signIn('demo', {
      demoType,
      redirect: false,
      callbackUrl,
    });
    if (res?.error) {
      toast.error(res.error || 'Could not start the demo session');
      return false;
    }
    window.location.href = res?.url ?? callbackUrl;
    return true;
  } catch (error) {
    console.error('[startDemoSession] failed', error);
    toast.error('Could not start the demo session');
    return false;
  }
}
