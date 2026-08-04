'use client';

import { useContext, type ReactNode } from 'react';

import { DismissDepthContext } from '@/hooks/useDismissOnEscape';

/**
 * Marks its children as nested *inside* a dismissible surface, so Escape goes
 * to them before it goes to the surface hosting them.
 *
 * WHERE THIS GOES: around the subtree that **disappears when this surface
 * closes** — its own panel — and nothing more. Not around the whole component.
 *
 * That is the whole rule, and it is mechanical rather than a judgement call.
 * The bug being prevented is an outer surface closing and taking an open inner
 * one down with it, so the question to ask is only ever "would dismissing this
 * destroy that?". Where the answer is no, the two are siblings and must stay
 * siblings: ties fall back to most-recently-opened, which is what a sibling
 * pair wants, and wrapping one anyway would wrongly make it always outrank its
 * neighbour.
 *
 * Applying that rule to every surface registered with `useDismissOnEscape`
 * gives exactly three hosts, and it is worth seeing why the near misses are
 * misses:
 *
 * - `SlideDrawer` — `{children}` unmounts with the drawer. Covers all fifteen
 *   admin drawers, including the `SortPopover`s in the order drawer and
 *   `DrawerChrome`'s delete confirm.
 * - `CartDrawer` — its portal payload, holding the per-line remove confirms.
 * - `AnnouncementBell` — its `{open && …}` popover, which hosts a
 *   `StoreInfoModal` and unmounts it on close.
 *
 * - `AdminTopbar` renders `DemoModeChip`, but *outside* the bell dropdown's
 *   conditional — closing the bell leaves the chip alone. Sibling.
 * - `CartItemsPanel`'s clear-confirm sits in the header; cancelling it does not
 *   unmount the rows whose own remove-confirms it would otherwise outrank.
 * - `ProfileMessages`' inline edit/delete confirm sits inside `<section>`;
 *   `NewMessageModal` is rendered after it. Sibling.
 * - `DrawerChrome`'s delete confirm does not contain the drawer body, so its
 *   children stay at the depth `SlideDrawer` already gave them.
 *
 * Note that no static rule can make this distinction — all four of the misses
 * above render another dismissible in their React subtree, and a lint rule
 * keyed on that would flag every one of them while missing `CartDrawer`, whose
 * nesting is in-file and has no import edge to see.
 *
 * Renders no DOM of its own, so it can be dropped in anywhere — including in
 * place of a fragment — without disturbing layout.
 */
const DismissBoundary = ({ children }: { children: ReactNode }) => {
  const depth = useContext(DismissDepthContext);
  return (
    <DismissDepthContext.Provider value={depth + 1}>
      {children}
    </DismissDepthContext.Provider>
  );
};

export default DismissBoundary;
