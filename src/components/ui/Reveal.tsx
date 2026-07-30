'use client';

import type { ReactNode } from 'react';

import { useIsMounted } from '@/hooks/useIsMounted';
import { useReveal } from '@/hooks/useReveal';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

const BASE =
  'transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none';

const Reveal = ({ children, className = '', delayMs = 0 }: RevealProps) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  // Render visible on the server and through the first client pass, then hide
  // once hydration has committed and the observer is armed. The naive version —
  // starting hidden — ships `opacity-0` in the HTML, so if the bundle never runs
  // (blocked chunk, a throw in an earlier client component, JS off) the content
  // stays invisible forever. That blanked the footer on every route and left
  // /our-story and /rewards as a navbar above an empty page, since both wrap
  // their h1 in a Reveal.
  //
  // The hide inherits the 1s transition below, so the worst case is a single
  // frame at ~98% opacity, and only for wrappers already on screen — anything
  // below the fold hides where nobody can see it.
  const mounted = useIsMounted();
  const stateClass =
    !mounted || visible
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-7';
  // Inline style for delay so consumers can pass any ms value without
  // bloating the Tailwind safelist with arbitrary `delay-[Nms]` classes.
  const style = delayMs ? { transitionDelay: `${delayMs}ms` } : undefined;
  return (
    <div ref={ref} className={`${BASE} ${stateClass} ${className}`} style={style}>
      {children}
    </div>
  );
};

export default Reveal;
