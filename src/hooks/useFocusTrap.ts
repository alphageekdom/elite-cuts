'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Focus management for modal surfaces: move focus in on open, keep Tab inside
 * while open, hand focus back to the opener on close.
 *
 * Every dialog in the app used to hand-roll some subset of this, and no two
 * agreed on which subset — `SlideDrawer` (which backs every admin drawer)
 * trapped Tab but never moved focus in or restored it, `StoreInfoModal` moved
 * focus in but dropped it to <body> on close, and only `CartDrawer` did all
 * three. Consolidating means a new dialog gets the whole behaviour in one line
 * instead of two-thirds of it by accident.
 *
 * Use this only for genuinely modal surfaces (`aria-modal="true"`). A popover
 * that leaves the page interactive behind it — `AnnouncementBellPopover`, say —
 * must NOT trap Tab; trapping is what makes a modal modal.
 *
 * Scroll locking is deliberately not handled here; that is `useScrollLock`.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Options = {
  // Element to focus on open. Defaults to the first focusable in the container.
  // Pass this when the first focusable isn't the right landing spot.
  initialFocusRef?: RefObject<HTMLElement | null>;
};

export function useFocusTrap(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  { initialFocusRef }: Options = {},
) {
  // Focus in on open, restore on close.
  //
  // The refs are listed as dependencies and cost nothing: a ref object keeps
  // the same identity for the life of the component, so in practice this only
  // re-runs when `open` flips. That matters — a previous bug had an effect like
  // this re-running on every parent render, which yanked focus back to the
  // close button each time a quantity changed inside the open cart drawer.
  //
  // **The dependency array is the guard, and it is the only guard.** Never add
  // a callback or an inline object here. Callers pass their options as a fresh
  // `{ … }` literal on every render, so listing that object would reintroduce
  // the bug exactly; listing the stable ref pulled out of it does not.
  //
  // The signature destructure is readability, not protection — this was checked
  // rather than assumed. Rewriting it as `options.initialFocusRef` and keeping
  // this array as-is passes every test in `useFocusTrap.test.tsx`; widening the
  // array to include the options object fails the re-render test immediately.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const target =
      initialFocusRef?.current ??
      containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target?.focus();

    return () => {
      // Documentation, not defence — kept deliberately, and worth reading
      // before "simplifying" it either way.
      //
      // `focus()` on a detached node is already a no-op: it neither throws nor
      // moves `activeElement` (verified in jsdom, and it is what the spec's
      // focusing steps require of an element that is not being rendered). So
      // this check skips a call that would do nothing, and removing it changes
      // no behaviour — which is why no test covers it, and why an earlier
      // version of this comment was wrong to claim the guard prevented focus
      // landing on <body>. Nothing prevents that: when the opener is gone,
      // there is no longer anywhere to restore focus to.
      //
      // It stays because it says out loud that the opener may have unmounted
      // while the dialog was up, which is a real case and not obvious.
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, containerRef, initialFocusRef]);

  // Tab cycling. Separate effect so a re-render that changes nothing about
  // `open` can re-attach the listener harmlessly without disturbing focus.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, containerRef]);
}
