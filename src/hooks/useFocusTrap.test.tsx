// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, useRef, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useFocusTrap } from './useFocusTrap';

// ── What this covers ────────────────────────────────────────────────────
// `useFocusTrap` end to end, rendered for real. It is the first file in this
// repo to opt into jsdom (see the docblock above and the note in
// vitest.config.mts) because the hook is *entirely* DOM manipulation — unlike
// `useDismissOnEscape` or `useRewardsStanding`, there is no module-level logic
// to lift into a `.ts` file and test in the node suite. A DOM is the whole
// subject.
//
// Every assertion below was mutation-proved: the hook was broken in the matching
// way and this file was confirmed to fail by name. Nine fail under a one-line
// mutation; the empty-panel one needs two, because two guards protect the same
// thing, and its own comment says which. Three further plausible-looking tests
// were written, found to survive every mutation aimed at them, and DELETED
// rather than kept as false comfort — see the note at the bottom of this file
// before adding one back.
//
// Boundary: this covers focus, Tab and effect lifecycle. It does not simulate
// real sequential focus navigation — jsdom has none — but the hook never relies
// on it, since it moves focus by calling `.focus()` itself.

let container: HTMLDivElement;
let root: Root;
let opener: HTMLButtonElement;

beforeEach(() => {
  // The opener sits OUTSIDE the React root, which is what it is in the app: a
  // navbar or toolbar button whose dialog renders elsewhere in the tree. It
  // also has to outlive a React unmount for the detached-opener case.
  opener = document.createElement('button');
  opener.id = 'opener';
  document.body.appendChild(opener);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  opener.remove();
});

/**
 * A modal panel. Three focusable children by default; the flags below shape it
 * into the cases the hook actually has to survive.
 */
function Harness({
  open,
  useInitialRef = false,
  empty = false,
  disabledFirst = false,
  trailingDisabled = false,
  bump = 0,
}: {
  open: boolean;
  useInitialRef?: boolean;
  empty?: boolean;
  /** Disable the leading child, so the focus-in target has to skip it. */
  disabledFirst?: boolean;
  /** Append a disabled submit, mirroring `DrawerChrome`'s real footer. */
  trailingDisabled?: boolean;
  bump?: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const secondRef = useRef<HTMLButtonElement | null>(null);
  // Deliberately an inline object literal. This is the exact shape the hook's
  // dependency-array comment warns about, and the re-render test below is what
  // holds that warning to account.
  useFocusTrap(open, panelRef, {
    initialFocusRef: useInitialRef
      ? (secondRef as RefObject<HTMLElement | null>)
      : undefined,
  });

  if (!open) return null;

  return (
    <div ref={panelRef} role='dialog' aria-modal='true'>
      {empty ? (
        <p>Nothing to focus here.</p>
      ) : (
        <>
          <button id='first' disabled={disabledFirst}>
            first
          </button>
          <button id='second' ref={secondRef}>
            second {bump}
          </button>
          <button id='last'>last</button>
          {trailingDisabled ? (
            <button id='submit' disabled>
              Save changes
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const activeId = () => document.activeElement?.id || '<none>';

const render = (props: Parameters<typeof Harness>[0]) =>
  act(() => root.render(<Harness {...props} />));

/** Dispatch a Tab keydown and hand back the event, so callers can read
 *  `defaultPrevented` — that is how the hook signals it took the key. */
const pressTab = (shiftKey = false) => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

describe('focus in and out', () => {
  it('moves focus to the first focusable child on open', () => {
    render({ open: false });
    opener.focus();

    render({ open: true });

    expect(activeId()).toBe('first');
  });

  it('skips a disabled child when choosing where to land', () => {
    render({ open: true, disabledFirst: true });

    expect(activeId()).toBe('second');
  });

  it('honours initialFocusRef over the first focusable child', () => {
    render({ open: false });

    render({ open: true, useInitialRef: true });

    expect(activeId()).toBe('second');
  });

  it('hands focus back to the opener on close', () => {
    render({ open: false });
    opener.focus();
    render({ open: true });
    expect(activeId()).toBe('first');

    render({ open: false });

    expect(activeId()).toBe('opener');
  });
});

describe('re-render stability', () => {
  // The cart-drawer bug: changing a quantity inside an open drawer re-rendered
  // the parent, which re-ran the focus-in effect and yanked focus back to the
  // close button on every click. The guard is that the dependency array lists
  // only values that survive a render.
  it('leaves focus alone when the parent re-renders', () => {
    render({ open: true });
    byId('last').focus();

    render({ open: true, bump: 1 });

    expect(activeId()).toBe('last');
  });
});

describe('tab cycling', () => {
  it('wraps forward from the last child to the first', () => {
    render({ open: true });
    byId('last').focus();

    const event = pressTab();

    expect(activeId()).toBe('first');
    expect(event.defaultPrevented).toBe(true);
  });

  it('wraps backward from the first child to the last', () => {
    render({ open: true });
    byId('first').focus();

    const event = pressTab(true);

    expect(activeId()).toBe('last');
    expect(event.defaultPrevented).toBe(true);
  });

  it('wraps from the last ENABLED child, ignoring a trailing disabled submit', () => {
    // This is `DrawerChrome`'s real footer: Cancel, then a Submit that seven of
    // the eight admin form drawers gate on a blocker or dirty state (the lone
    // exception is `ProductFormDrawer`), so a drawer commonly opens with a
    // DISABLED control as its final child. If the selector stopped filtering
    // `[disabled]`, that button would become `last`, Tab from Cancel would not
    // wrap, and — since `SlideDrawer` only marks itself inert while CLOSED, and
    // nothing inerts the page behind an open one — focus would leave the
    // dialog entirely.
    render({ open: true, trailingDisabled: true });
    byId('last').focus();

    const event = pressTab();

    expect(activeId()).toBe('first');
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a mid-list Tab to the browser', () => {
    render({ open: true });
    byId('second').focus();

    const event = pressTab();

    expect(activeId()).toBe('second');
    expect(event.defaultPrevented).toBe(false);
  });

  it('leaves Tab alone when the panel has no focusable children', () => {
    // A dialog of pure prose. Two independent guards keep this safe — the
    // length bail, and the `active === first/last` boundary checks, which can
    // never match when both are `undefined`. Removing either alone is harmless;
    // removing both makes every Tab throw
    // `Cannot read properties of undefined (reading 'focus')`. This is the only
    // test here that needs a two-line mutation to fail, and that is the point
    // of it: it is the one covering the second guard.
    render({ open: true, empty: true });
    opener.focus();

    const event = pressTab();

    expect(activeId()).toBe('opener');
    expect(event.defaultPrevented).toBe(false);
  });
});

// ── Deliberately not tested ─────────────────────────────────────────────
// Each of these was written, mutation-tested, found to pass with the code it
// claimed to cover REMOVED, and deleted. Do not re-add without a mutation that
// the new test actually catches.
//
// 1. The `isConnected` guard before the restore call. Removing the guard breaks
//    nothing, because `focus()` on a detached node is already a no-op — it
//    neither throws nor moves `activeElement`. Verified directly in jsdom, and
//    it matches the spec's focusing steps. See the hook's own comment there.
//
// 2. The keydown listener's `removeEventListener` cleanup. Leaking the listener
//    breaks nothing: the container unmounts with the dialog, so a leaked
//    handler bails at `if (!root) return` on the next Tab. Worth knowing the
//    cleanup is belt-and-braces rather than load-bearing — a test named for it
//    would really be covering the null-root guard.
//
// 3. "Stops trapping once closed", for the same reason as 2.
//
// 4. "Focus outside the panel is not pulled back in." True — the trap only acts
//    at the first/last boundary, so focus that starts outside never enters —
//    but it is a limitation, not a guard, and no mutation catches it. It is
//    also not reachable: all seven consumers render a `fixed inset-0` overlay
//    that closes on click, so a click cannot strand focus outside an open
//    surface. Recorded here so it is not re-filed as a defect.
