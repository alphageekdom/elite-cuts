'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { labelCls } from './AdminForm';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import XIcon from '@/components/uielements/XIcon';

// Shared chrome for every admin form drawer: header, scrolling body, footer.
//
// `SlideDrawer` already owns the overlay, slide, dialog role, focus trap,
// Escape and scroll lock — this module is what goes *inside* it. Before it,
// nine drawers hand-rolled the same three regions: titles rendered at 20px,
// 22px and 26px, headers padded `px-6 py-5` / `px-8 py-6` / `px-6 pt-4 pb-3`,
// and field labels written five ways (tracking 0.14/0.18/0.22em and
// `tracking-widest`, at 10px and 11px) while `labelCls` sat unused.
//
// WHAT IS DELIBERATELY NOT HERE. The design this came from also specified a
// `choice` pill group and a `pick` row-card selector as shared field types.
// Neither shipped, because neither has consumers:
//
//   - `choice` (pills) — zero. Every dropdown in the admin is a native
//     `<select>` through `SelectField`, on purpose: the OS picker is better on
//     mobile and pills cannot carry the 50-state or 9-hour-slot lists. The
//     design replaced all 48 with pills; that trade is not worth making.
//   - `pick` (row cards) — one, the initial-status group in
//     `OrderCreateDrawer`. A single consumer does not earn a shared component,
//     and a generic version would have carried multi-select, a meta column and
//     an empty state that nothing asked for.
//
// If a second consumer for either turns up, extract it then.

// ---------------------------------------------------------------------------
// Widths
// ---------------------------------------------------------------------------

/**
 * Three tiers, replacing the five ad-hoc values that were in use
 * (`max-w-md`, `-135`, `-145`, `-150`, `-2xl`). Pass to `SlideDrawer`'s
 * `widthClass`.
 */
export const DRAWER_WIDTH = {
  /** 500px — a handful of fields. Staff, shift, delivery, message. */
  narrow: 'max-w-125',
  /** 600px — the common case. Promo, order, customer. */
  default: 'max-w-150',
  /** 680px — long or two-column forms. Product, stocktake, import. */
  wide: 'max-w-170',
} as const;

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

type HeaderProps = {
  /** Small uppercase kicker, e.g. "New order". */
  eyebrow?: string;
  /** ReactNode so a drawer can accent part of the title, e.g. the product name. */
  title: ReactNode;
  /** Must match the `ariaLabelledBy` given to the surrounding SlideDrawer. */
  titleId: string;
  sub?: ReactNode;
  /**
   * Drop the subtitle below `sm:`. For drawers whose body is the point and
   * whose header would otherwise push it down — the stocktake list starts
   * ~150px higher on an iPhone SE with this on, which is why it was added
   * there in the first place.
   */
  hideSubOnMobile?: boolean;
  onClose: () => void;
  /** Rendered under the subtitle — status pills, a code chip, etc. */
  children?: ReactNode;
};

export function DrawerHeader({
  eyebrow,
  title,
  titleId,
  sub,
  hideSubOnMobile = false,
  onClose,
  children,
}: HeaderProps) {
  return (
    // Padding and title size step down below `sm:` for every drawer, not just
    // the stocktake one that first needed it — a phone has no room to spend on
    // chrome above the fields.
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line-soft px-6 pt-4 pb-3 sm:pt-5 sm:pb-4">
      <div className="min-w-0">
        {eyebrow && <p className={`${labelCls} mb-1`}>{eyebrow}</p>}
        <h2
          id={titleId}
          className="font-display text-[20px] font-medium leading-snug tracking-tight sm:text-[22px]"
        >
          {title}
        </h2>
        {sub && (
          <p
            className={`mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-muted ${
              hideSubOnMobile ? 'hidden sm:block' : ''
            }`}
          >
            {sub}
          </p>
        )}
        {children}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>;
}

type FooterProps = {
  /**
   * What still stands between the admin and a valid submit, e.g.
   * "Select a customer". Announced politely and paired with a disabled CTA —
   * the pattern `OrderCreateDrawer` already used, lifted here so every drawer
   * explains itself the same way instead of only that one.
   */
  blocker?: string | null;
  /** Shown when there is no blocker — e.g. "No changes yet" on an edit form. */
  hint?: string | null;
  /**
   * Replaces the message slot with a control — the stocktake drawer puts its
   * "N changes · ±X total" filter toggle there. Keeps the footer frame shared
   * even where the left slot is bespoke. A drawer using this gives up the
   * polite announcement, so only reach for it when there is no blocker to
   * announce in the first place.
   */
  leading?: ReactNode;
  onCancel: () => void;
  /**
   * Omit when the drawer wraps a `<form>` and passes `submitType="submit"` —
   * the button then submits the form natively, keeping Enter-to-submit and
   * browser validation, which a `type="button"` CTA silently drops.
   */
  onSubmit?: () => void;
  submitType?: 'button' | 'submit';
  submitLabel: string;
  /** Replaces the label while in flight, e.g. "Saving…". */
  busyLabel?: string;
  busy?: boolean;
  /** Disable for reasons beyond the blocker (e.g. an untouched edit form). */
  disabled?: boolean;
  /** Destructive or secondary action, rendered left of Cancel. */
  extra?: ReactNode;
};

export function DrawerFooter({
  blocker,
  hint,
  leading,
  onCancel,
  onSubmit,
  submitType = 'button',
  submitLabel,
  busyLabel,
  busy = false,
  disabled = false,
  extra,
}: FooterProps) {
  const blocked = !!blocker && !busy;
  const message = busy ? null : (blocker ?? hint ?? null);

  return (
    // Everything here wraps. A single non-wrapping row fitted until a drawer
    // put a delete confirm in `extra`: "Delete? · Yes, delete · Keep · Cancel ·
    // Save changes" is ~420px of nowrap pills, which pushed the CTA clean off
    // an iPhone SE and clipped Cancel with it. The footer does not scroll, so
    // those controls were simply unreachable.
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-paper px-6 py-4">
      {leading ?? (
        // The floor stops the message shrinking to nothing between the buttons,
        // which is where the blocker explaining the disabled CTA lives.
        <span
          aria-live="polite"
          className={`min-w-32 flex-1 truncate text-[12px] ${blocked ? 'text-oxblood' : 'text-muted'}`}
        >
          {message ?? ''}
        </span>
      )}
      {/* `ml-auto` only bites once the cluster has wrapped onto its own line,
          where `justify-between` would otherwise strand it at the left. */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {extra}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type={submitType}
          onClick={onSubmit}
          disabled={busy || blocked || disabled}
          className="rounded-full bg-ink px-4.5 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && busyLabel ? busyLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}

type DeleteConfirmProps = {
  /** Trigger label. Defaults to "Delete". */
  label?: string;
  /** Confirm-button label while the delete is in flight. */
  busyLabel?: string;
  /** The delete is running — swaps the confirm label and locks both buttons. */
  busy?: boolean;
  /** Locked for a reason other than the delete itself, e.g. a save in flight. */
  disabled?: boolean;
  onDelete: () => void;
};

/**
 * The destructive action for a `DrawerFooter`'s `extra` slot: a Delete button
 * that turns into "Delete? · Yes, delete · Keep" in place.
 *
 * Three drawers had this markup character-for-character, and all three shared
 * the same two defects. Swapping the trigger for the confirm left keyboard
 * focus on a button that no longer existed, so it fell to `<body>` — a
 * keyboard admin was dropped at the top of the document with no announcement
 * that anything had appeared. And Escape closed the whole drawer instead of
 * collapsing the confirm, discarding the form. Both are fixed here once
 * rather than three times.
 */
export function DrawerDeleteConfirm({
  label = 'Delete',
  busyLabel = 'Deleting…',
  busy = false,
  disabled = false,
  onDelete,
}: DeleteConfirmProps) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef(false);
  const questionId = useId();

  // Focus follows whichever control replaced the one that was just pressed.
  // Both directions have to wait for the re-render — the element being focused
  // is the one that does not exist yet at the moment the state flips.
  useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus();
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  const cancel = useCallback(() => {
    returnFocusRef.current = true;
    setConfirming(false);
  }, []);

  // Escape belongs to the confirm while it is open — the innermost surface
  // wins, the same rule the popovers inside the admin tables follow.
  useDismissOnEscape(confirming, cancel);

  if (!confirming) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy || disabled}
        className="rounded-full border border-oxblood/30 px-3.5 py-2 text-[12px] font-medium text-oxblood transition-colors hover:bg-red-soft disabled:opacity-50"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span id={questionId} className="text-[12px] text-oxblood">
        Delete?
      </span>
      {/* Describing the confirm with the question means a screen reader hears
          what is being asked when focus lands, not a bare "Yes, delete". */}
      <button
        ref={confirmRef}
        type="button"
        onClick={onDelete}
        disabled={busy || disabled}
        aria-describedby={questionId}
        className="rounded-full bg-oxblood px-3.5 py-2 text-[12px] font-medium text-cream transition-colors hover:bg-oxblood-deep disabled:opacity-50"
      >
        {busy ? busyLabel : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={busy || disabled}
        className="rounded-full border border-line px-3.5 py-2 text-[12px] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
      >
        Keep
      </button>
    </span>
  );
}
