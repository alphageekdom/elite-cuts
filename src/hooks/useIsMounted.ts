'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Returns false during SSR and the first client render (hydration), then true
// once hydration completes. Use this to gate portal-rendered UI, browser-only
// APIs, or anything that must render the same on the server as the first client
// pass. Implemented via useSyncExternalStore so React's hydration machinery
// handles the transition without a setState-in-effect.
export function useIsMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
