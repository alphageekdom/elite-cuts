'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Sign-out for the admin shell, shared by the desktop sidebar's user menu and
 * the mobile "more" sheet.
 *
 * Shared rather than inlined twice because the two surfaces have to agree on
 * where sign-out lands. `redirect: false` plus an explicit `router.replace`
 * matches the customer navbar, and the target has to be the storefront rather
 * than the current page: the admin layout redirects any non-admin session to
 * `/login`, so staying put would bounce a just-signed-out admin to a login
 * screen instead of somewhere they can actually be.
 *
 * `busy` is exposed so callers can disable their trigger while the round trip
 * is in flight.
 *
 * What actually stops a double-fire is that two real click events arrive in
 * separate ticks, so React re-renders and `disabled` catches the second —
 * measured: a genuine double-click produces one request. The `if (busy)` line
 * alone does not close the window, because it reads a value captured at render:
 * three clicks dispatched synchronously all pass it and produce three requests
 * and three toasts. That is unreachable by a human input device, and the end
 * state is identical either way (session cleared, redirected), so it is left
 * as is. Do not copy this reasoning to a surface where the repeated call
 * mutates something — there it needs a ref guard, as checkout's order button
 * does.
 */
export function useAdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut({ redirect: false });
      // Matches the customer navbar's wording for the same action.
      toast.success('Signed out successfully');
      router.replace('/');
    } catch (error) {
      console.error('[admin sign-out]', error);
      toast.error('Could not sign you out. Try again.');
      setBusy(false);
    }
  }

  return { handleSignOut, busy };
}
