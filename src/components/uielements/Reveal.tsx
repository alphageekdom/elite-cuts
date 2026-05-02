'use client';

import type { ReactNode } from 'react';

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
  const stateClass = visible
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
