'use client';

import { Fragment, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

import { computeFloatingMenuPos, type FloatingMenuPos } from '@/lib/floatingMenu';

export type RowActionsMenuItem = {
  label: string;
  // SVG element; the wrapping span colors it camel (or red for destructive)
  // via currentColor, so the SVG should use stroke="currentColor" / fill="currentColor".
  icon: ReactNode;
  // Exactly one of onSelect or href. href renders as a next/link.
  onSelect?: () => void;
  href?: string;
  // Renders a `border-t border-cream/25` divider above this item.
  divider?: boolean;
  // Red text + red icon (e.g. Delete).
  destructive?: boolean;
  disabled?: boolean;
  // Becomes the title attribute when disabled (e.g. "Demo accounts cannot be deleted").
  disabledReason?: string;
};

type Props = {
  // Accessible label for the trigger button, e.g. "Actions for Carlos Mendez".
  ariaLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RowActionsMenuItem[];
  // Defaults sized for ~3 items; bump when the menu is taller so the
  // flip-above heuristic doesn't drop the menu over the pagination strip.
  estimatedMenuHeight?: number;
};

const MENU_WIDTH = 176;

export default function AdminRowActionsMenu({
  ariaLabel,
  open,
  onOpenChange,
  items,
  estimatedMenuHeight = 150,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<FloatingMenuPos | null>(null);

  // Portal the menu out of the table so it escapes overflow-hidden ancestors;
  // re-pin on scroll/resize so the menu tracks the trigger when the page or
  // table scrolls. computeFloatingMenuPos flips above when room-below is short.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      setMenuPos(
        computeFloatingMenuPos(btn.getBoundingClientRect(), {
          menuWidth: MENU_WIDTH,
          estimatedMenuHeight,
        }),
      );
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, estimatedMenuHeight]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={`w-7 h-7 grid place-items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/40 ${
          open
            ? 'border-oxblood bg-cream text-ink'
            : 'border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink'
        }`}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
          className="fixed z-50 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => {
            const itemClass = `w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors hover:bg-cream/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
              item.destructive ? 'text-red-400' : 'text-cream'
            }`;
            const iconWrapClass = `shrink-0 ${item.destructive ? 'text-red-400' : 'text-camel'}`;
            const onClick = () => {
              if (item.disabled) return;
              onOpenChange(false);
              item.onSelect?.();
            };
            const content = (
              <>
                <span className={iconWrapClass}>{item.icon}</span>
                {item.label}
              </>
            );
            return (
              <Fragment key={i}>
                {item.divider && <div className="border-t border-cream/25" />}
                {item.href ? (
                  <Link href={item.href} role="menuitem" onClick={() => onOpenChange(false)} className={itemClass}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onClick}
                    disabled={item.disabled}
                    aria-disabled={item.disabled}
                    title={item.disabled ? item.disabledReason : undefined}
                    className={itemClass}
                  >
                    {content}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
