'use client';

import { useLinkStatus } from 'next/link';

/**
 * Renders inside a `<Link>` and fades in while that link's navigation is in
 * flight. The catalog reads `searchParams` and hits the database on every
 * render, so a filter or page click can sit for a beat with nothing to show
 * for it — this makes the control the user actually clicked look busy instead
 * of dead. Only the clicked link reacts; `useLinkStatus` is scoped to its
 * nearest Link ancestor.
 */
const LinkPendingDot = () => {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden='true'
      className={`h-1 w-1 shrink-0 rounded-full bg-current transition-opacity duration-200 motion-reduce:transition-none ${
        pending ? 'animate-pulse opacity-100' : 'opacity-0'
      }`}
    />
  );
};

export default LinkPendingDot;
