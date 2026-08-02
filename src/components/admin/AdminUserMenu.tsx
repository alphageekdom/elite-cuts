'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { computeFloatingMenuPos, type FloatingMenuPos } from '@/lib/floatingMenu';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { useAdminSignOut } from '@/hooks/admin/useAdminSignOut';
import SignOutIcon from '@/components/ui/icons/SignOutIcon';

type Props = {
  name: string;
  initial: string;
  collapsed: boolean;
};

const MENU_WIDTH = 176;
// Measured, not rounded up. `computeFloatingMenuPos` subtracts this estimate
// from the trigger's top when it flips the menu above — which is always, here,
// since the trigger sits at the bottom of a full-height panel. So any padding
// in the estimate lands directly in the visible gap: 52 against a real 41.5
// pushed the menu 14.5px off the card instead of the intended 4.
const MENU_HEIGHT = 42;

/**
 * The sidebar's user card, as a real menu trigger.
 *
 * It has looked like one since launch — `cursor-pointer` plus a hover
 * background — while having no handler at all. Sign-out was the missing
 * behaviour: it existed nowhere in the admin shell, so an admin had to
 * navigate to the customer storefront to end their session.
 *
 * Portal-rendered because the sidebar `<aside>` is `overflow-hidden` (it has
 * to be, for the collapse width transition). An absolutely-positioned menu
 * would be clipped at 64px wide in the collapsed state, where the card is a
 * bare avatar and the menu is nearly three times the panel's width. Reuses
 * `computeFloatingMenuPos`, the helper the row-action menus already use for
 * exactly this problem, which also flips the menu above the trigger — always
 * the case here, since the card sits at the bottom of a full-height panel.
 */
export default function AdminUserMenu({ name, initial, collapsed }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<FloatingMenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { handleSignOut, busy } = useAdminSignOut();

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      setPos(
        computeFloatingMenuPos(btn.getBoundingClientRect(), {
          menuWidth: MENU_WIDTH,
          estimatedMenuHeight: MENU_HEIGHT,
        }),
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useDismissOnEscape(open, () => {
    setOpen(false);
    triggerRef.current?.focus();
  });

  // Move focus into the menu once it exists. Without this the menu was
  // pointer-only: the panel portals to the end of `document.body`, so Tab from
  // the open trigger walked into the topbar while the menu sat there open, and
  // the one item in it could never be reached by keyboard. That made sign-out —
  // this component's whole reason to exist — unreachable without a mouse on
  // both surfaces that use it.
  //
  // Guarded by a ref rather than keyed on `pos` alone, because `pos` also
  // updates on resize and re-focusing mid-interaction would yank the caret back.
  const hasFocusedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hasFocusedRef.current = false;
      return;
    }
    if (!pos || hasFocusedRef.current) return;
    hasFocusedRef.current = true;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, pos]);

  // Tab out of the menu closes it and hands focus back to the trigger, so the
  // next Tab continues from where the user actually was in the page rather
  // than from the end of `document.body` where the portal lives.
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Clicking away is handled by the mousedown listener above; this covers
  // focus leaving by any other route. The trigger is excluded so its own
  // click-to-close isn't fighting a close that already happened on blur.
  function handleMenuBlur(e: React.FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (!next) return;
    if (menuRef.current?.contains(next)) return;
    if (triggerRef.current?.contains(next)) return;
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        // Expanded, the button names itself from its own visible text, so voice
        // control resolves what it reads and no aria-label can contradict it.
        // Collapsed, only the avatar shows, so a label is the only name there is.
        aria-label={collapsed ? `${name}, Admin, account menu` : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-camel ${
          open ? 'bg-cream/10' : 'hover:bg-cream/8'
        } ${collapsed ? 'justify-center' : ''}`}
      >
        {/* Decorative: the initial duplicates the name beside it, and as
            visible text it also had to appear in the button's accessible
            name for `label-content-name-mismatch` to pass. */}
        <div
          aria-hidden="true"
          className="w-9 h-9 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-sm shrink-0"
        >
          {initial}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-medium text-cream truncate">{name}</div>
            <div className="text-[11px] text-cream/55 tracking-[0.06em] uppercase">Admin</div>
          </div>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          onBlur={handleMenuBlur}
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="fixed z-50 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={busy}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream transition-colors hover:bg-cream/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-camel"
          >
            <span className="shrink-0 text-camel">
              <SignOutIcon className="w-4 h-4" />
            </span>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
