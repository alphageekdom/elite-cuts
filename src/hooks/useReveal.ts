'use client';

import { useEffect, useRef, useState } from 'react';

// One-shot scroll-reveal hook. Returns a ref to attach to any element +
// a `visible` flag that flips true once the element crosses the threshold.
// Threshold 0.12 / rootMargin -60px bottom mirrors the source design's
// `.reveal` IntersectionObserver. Unobserves on first intersection so the
// callback never fires again — no flicker on rapid scroll, no perf cost.
export const useReveal = <T extends HTMLElement = HTMLDivElement>() => {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
};
