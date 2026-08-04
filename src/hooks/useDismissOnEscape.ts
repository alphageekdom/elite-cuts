'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Escape ownership for dismissible surfaces (drawers, modals, popovers,
 * dropdowns, inline confirms).
 *
 * The problem this solves: every surface used to register its own `document`
 * keydown listener. Listeners on the same node in the same phase fire in
 * registration order, so when a popover opened *inside* an already-open drawer,
 * the drawer's listener won — one Escape closed the whole drawer and discarded
 * the admin's unsaved edits. Which surface Escape belonged to was decided by an
 * accident of mount order.
 *
 * Instead, open surfaces register on one stack and a single listener dispatches
 * Escape to the innermost one. "Innermost" is read from React nesting via
 * `DismissDepthContext` — a surface that can host other dismissibles wraps them
 * in `<DismissBoundary>`, which raises the depth for its subtree. Ties, which
 * are genuine siblings, fall back to most-recently-registered; that is what a
 * sibling pair wants.
 *
 * Registration order alone is not enough, which is the whole reason for the
 * depth: React runs child effects before parent ones, so two nested surfaces
 * mounting already-open in the same commit register child-then-parent, and the
 * OUTER one would land on top and eat the key.
 *
 * Depth rather than DOM containment, because `CartDrawer` and
 * `AdminRowActionsMenu` render through `createPortal` — their DOM parent is
 * `document.body`, so a DOM-depth check ranks a portalled child as *outside*
 * the surface that owns it. React context flows through portals, so this needs
 * no special-casing for them.
 *
 * Depth rather than focus containment, which was the obvious alternative and
 * would have quietly restored the original bug. Popovers here do not move focus
 * into their panel — `SortPopover` only *restores* focus to the trigger, on
 * dismiss — so with a status popover open inside an order drawer, the drawer
 * contains `document.activeElement` and the popover does not. Dispatching to
 * the surface containing focus would close the drawer and discard the unsaved
 * status, which is precisely the failure this hook exists to prevent.
 *
 * A host that forgets its boundary degrades to the old behaviour rather than
 * breaking: everything sits at depth 0 and ties resolve by registration order.
 *
 * The listener is capture-phase but never stops propagation, so a control that
 * isn't registered — an inline edit field, say — still sees Escape and cancels
 * itself even while some unrelated popover is open elsewhere.
 */

type Entry = { depth: number; dismiss: () => void };

const stack: Entry[] = [];
let listening = false;

/**
 * Depth of the surrounding dismissible surface. Raised by `DismissBoundary`,
 * which is the only thing that should ever provide it.
 */
export const DismissDepthContext = createContext(0);

/**
 * Exported for tests only — no runtime consumer outside this module.
 * (`DismissBoundary` reaches for `DismissDepthContext` above, not for this.)
 *
 * The dispatch rules here are where the risk in this module actually sits, and
 * they are plain module logic — no DOM, no render — so they are testable in the
 * existing node suite. Same seam as `useRewardsStanding`'s `loadStanding`.
 */
export function registerDismissable(entry: Entry): () => void {
  stack.push(entry);
  listen();
  return () => {
    const i = stack.indexOf(entry);
    if (i !== -1) stack.splice(i, 1);
    unlisten();
  };
}

/**
 * Dismiss the innermost open surface. Returns whether anything was dismissed.
 *
 * `>=` rather than `>` is the tie-break: among entries at equal depth the last
 * registered wins, so two sibling popovers behave as they always did and the
 * most recently opened closes first.
 */
export function dismissInnermost(): boolean {
  let winner: Entry | null = null;
  for (const entry of stack) {
    if (!winner || entry.depth >= winner.depth) winner = entry;
  }
  if (!winner) return false;
  winner.dismiss();
  return true;
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  // Deliberately does NOT stopPropagation. Nothing needs shielding any more —
  // the drawer that used to race for Escape is on this stack now, so it only
  // fires when it's actually innermost. Swallowing the event instead would hide
  // it from handlers that aren't registered at all: an inline control such as
  // the inventory stock-edit input would stop cancelling on Escape merely
  // because some unrelated popover happened to be open elsewhere.
  //
  // Capture phase, though, so an un-migrated handler that stops propagation
  // itself can't prevent the innermost surface from closing.
  dismissInnermost();
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
 * Claims Escape while `open` is true. The innermost open surface wins.
 *
 * Callers may pass an inline arrow — the callback is held in a ref so the
 * stack entry is registered once per open, not re-registered (and re-ordered
 * above its own children) on every parent render.
 */
export function useDismissOnEscape(open: boolean, onDismiss: () => void) {
  const depth = useContext(DismissDepthContext);
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;
    return registerDismissable({ depth, dismiss: () => latest.current() });
  }, [open, depth]);
}
