'use client';

import { useEffect } from 'react';

// Landing directly on a #fragment URL (shared link, bookmark, search result)
// neither scrolled nor moved focus: the browser jumps to the fragment before
// hydration, then Next's scroll restoration resets the page to the top —
// verified on /terms#promises with scrollY 0 and focus still on <body>.
// In-page anchor *clicks* were always fine; only the initial document load
// needs help, so this runs once per full load and never on soft navigation
// (the root layout doesn't remount).
//
// The scrollY guard keeps this from yanking someone who started scrolling
// before hydration finished — if the page isn't still parked at the top,
// the jump is abandoned rather than fought over.
const InitialFragmentScroll = () => {
  useEffect(() => {
    const { hash } = window.location;
    if (!hash) return;

    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return; // malformed percent-encoding in a hand-mangled URL — nothing to jump to
    }
    if (!id) return;

    // One frame later so this lands after the router's own scroll reset.
    const frame = requestAnimationFrame(() => {
      if (window.scrollY > 0) return;
      const target = document.getElementById(id);
      if (!target) return;

      // Focus for keyboard/screen-reader users, the way the legal pages'
      // contents rail already does — granting focusability where a plain
      // section doesn't have it.
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
};

export default InitialFragmentScroll;
