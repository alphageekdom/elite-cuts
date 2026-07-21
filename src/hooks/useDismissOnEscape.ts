'use client';

import { useEffect, useRef } from 'react';

/**
 * Escape ownership for dismissible surfaces (drawers, modals, popovers,
 * dropdowns, inline confirms).
 *
 * The problem this solves: every surface used to register its own
 * `document` keydown listener. Listeners on the same node in the same phase
 * fire in registration order, so when a popover opened *inside* an already-open
 * drawer, the drawer's listener won — one Escape closed the whole drawer and
 * discarded the admin's unsaved edits. Which surface Escape belonged to was
 * decided by an accident of mount order.
 *
 * Instead, open surfaces push onto a stack and a single listener dispatches
 * Escape to whichever is on top — the innermost one, by construction, with no
 * dependence on registration order.
 *
 * The listener is capture-phase but never stops propagation, so a control that
 * isn't on the stack — an inline edit field, say — still sees Escape and
 * cancels itself even while some unrelated popover is open elsewhere.
 *
 * KNOWN ASSUMPTION: "last pushed" stands in for "innermost", which holds while
 * surfaces open one after another — open the drawer, then open a popover in it.
 * It does NOT hold if two nested surfaces mount already-open in the same commit,
 * because React runs child effects before parent ones, so the OUTER surface
 * would land on top and eat Escape. Nothing does that today (nested surfaces
 * always mount closed and are opened by a later interaction), but note that
 * `CustomersFilterPanel` passes `open` as a literal `true` — that shape is only
 * safe while nothing above it is also mounting open. If you need it, dispatch to
 * the entry containing `document.activeElement` instead of the last one; that
 * costs a container ref at every call site and needs care for portalled
 * surfaces, whose DOM depth doesn't match their React nesting.
 */

type Entry = { dismiss: () => void };

const stack: Entry[] = [];
let listening = false;

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (!top) return;
  // Deliberately does NOT stopPropagation. Nothing needs shielding any more —
  // the drawer that used to race for Escape is on this stack now, so it only
  // fires when it's actually on top. Swallowing the event instead would hide
  // it from handlers that aren't on the stack at all: an inline control such
  // as the inventory stock-edit input would stop cancelling on Escape merely
  // because some unrelated popover happened to be open elsewhere.
  //
  // Capture phase, though, so an un-migrated handler that stops propagation
  // itself can't prevent the top surface from closing.
  top.dismiss();
};

const listen = () => {
  if (listening) return;
  document.addEventListener('keydown', onKeyDown, true);
  listening = true;
};

const unlisten = () => {
  if (!listening || stack.length > 0) return;
  document.removeEventListener('keydown', onKeyDown, true);
  listening = false;
};

/**
 * Claims Escape while `open` is true. The most recently opened surface wins.
 *
 * Callers may pass an inline arrow — the callback is held in a ref so the
 * stack entry is pushed once per open, not re-pushed (and re-ordered above its
 * own children) on every parent render.
 */
export function useDismissOnEscape(open: boolean, onDismiss: () => void) {
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;
    const entry: Entry = { dismiss: () => latest.current() };
    stack.push(entry);
    listen();
    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      unlisten();
    };
  }, [open]);
}
