'use client';

import { useState } from 'react';

import { startDemoSession, type DemoType } from '@/lib/auth/demo-signin';

// Pending-state wrapper around `startDemoSession`, shared by the two door
// cards and the closing CTA band on /demo — both offer the same pair of
// buttons and both need to lock out a second click while one is in flight.
export function useDemoStart() {
  const [pending, setPending] = useState<DemoType | null>(null);

  const start = async (demoType: DemoType) => {
    if (pending) return;
    setPending(demoType);
    const ok = await startDemoSession(demoType);
    // On success the helper hard-navigates, so `pending` stays set until the
    // new page replaces this one — clearing it would flash the idle label.
    if (!ok) setPending(null);
  };

  return { pending, start };
}
