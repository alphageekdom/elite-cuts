import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── What this covers ────────────────────────────────────────────────────
// The dispatch half of `useDismissOnEscape`: which open surface Escape goes
// to, and the listener's attach/detach lifecycle. The hook wrapper needs a
// renderer (no component-test setup in this repo), but the rules that decide
// ownership are plain module logic and are where the risk sits — getting them
// wrong loses an admin's unsaved order edits, which is the bug this whole
// mechanism was built for.
//
// The parking-lot entry for this chore asserted "no unit tests are possible"
// because Vitest is `environment: 'node'` and `.tsx` isn't in the glob. That
// reasoning doesn't apply: this is a `.ts` file already inside the glob, and
// only the hook needs React.
//
// The module is re-imported per test via `vi.resetModules()` so the stack
// starts empty each time — the same pattern `useRewardsStanding.test.ts` and
// `lib/demo/exclude.test.ts` use for their module-level state.

type Handler = (event: { key: string }) => void;

let addEventListener: ReturnType<typeof vi.fn>;
let removeEventListener: ReturnType<typeof vi.fn>;
let keydown: Handler | null;

const freshModule = async () => {
  const mod = await import('./useDismissOnEscape');
  return {
    register: mod.registerDismissable,
    dismissInnermost: mod.dismissInnermost,
  };
};

beforeEach(() => {
  vi.resetModules();
  keydown = null;
  addEventListener = vi.fn((_type, handler) => {
    keydown = handler as Handler;
  });
  removeEventListener = vi.fn(() => {
    keydown = null;
  });
  vi.stubGlobal('document', { addEventListener, removeEventListener });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('dismissInnermost — depth decides, not registration order', () => {
  it('dismisses the deeper surface even when the outer one registered last', async () => {
    // THE BUG. Two nested surfaces mounting already-open in one commit register
    // child-then-parent, because React runs child effects before parent ones.
    // Under a plain last-in-wins stack the OUTER surface lands on top and eats
    // Escape — closing an order drawer and discarding the unsaved status, which
    // is the original data-loss bug reached by a different route.
    const { register, dismissInnermost } = await freshModule();
    const popover = vi.fn();
    const drawer = vi.fn();

    register({ depth: 1, dismiss: popover }); // child effect runs first
    register({ depth: 0, dismiss: drawer }); // parent effect runs second

    dismissInnermost();

    expect(popover).toHaveBeenCalledTimes(1);
    expect(drawer).not.toHaveBeenCalled();
  });

  it('dismisses the deeper surface when it registered last too', async () => {
    // The sequential path — open a drawer, then open a popover inside it. This
    // one was already correct before the depth existed; it must stay correct.
    const { register, dismissInnermost } = await freshModule();
    const drawer = vi.fn();
    const popover = vi.fn();

    register({ depth: 0, dismiss: drawer });
    register({ depth: 1, dismiss: popover });

    dismissInnermost();

    expect(popover).toHaveBeenCalledTimes(1);
    expect(drawer).not.toHaveBeenCalled();
  });

  it('falls back to most-recently-registered among equal depths', async () => {
    // Genuine siblings — the toolbar sort popover and a row-actions menu on the
    // same page. Neither contains the other, so the one opened most recently is
    // the one the user means.
    const { register, dismissInnermost } = await freshModule();
    const first = vi.fn();
    const second = vi.fn();

    register({ depth: 0, dismiss: first });
    register({ depth: 0, dismiss: second });

    dismissInnermost();

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('reaches the next surface once the innermost one unregisters', async () => {
    const { register, dismissInnermost } = await freshModule();
    const drawer = vi.fn();
    const popover = vi.fn();

    register({ depth: 0, dismiss: drawer });
    const closePopover = register({ depth: 1, dismiss: popover });

    dismissInnermost();
    closePopover();
    dismissInnermost();

    expect(popover).toHaveBeenCalledTimes(1);
    expect(drawer).toHaveBeenCalledTimes(1);
  });

  it('reports whether anything was open', async () => {
    const { register, dismissInnermost } = await freshModule();

    expect(dismissInnermost()).toBe(false);

    register({ depth: 0, dismiss: vi.fn() });
    expect(dismissInnermost()).toBe(true);
  });
});

describe('registerDismissable — unregistering', () => {
  it('removes its own entry, not whichever happens to be on top', async () => {
    // Surfaces do not always close in the order they opened: a drawer's
    // close-on-navigate can fire while a popover inside it is still mounted.
    const { register, dismissInnermost } = await freshModule();
    const outer = vi.fn();
    const inner = vi.fn();

    const closeOuter = register({ depth: 0, dismiss: outer });
    register({ depth: 1, dismiss: inner });

    closeOuter();
    dismissInnermost();

    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('is safe to call twice and does not evict a later entry', async () => {
    // React 19 strict mode mounts, unmounts and remounts effects, so a cleanup
    // can run against an entry that is already gone. Splicing by index rather
    // than identity would take an innocent neighbour with it.
    const { register, dismissInnermost } = await freshModule();
    const gone = vi.fn();
    const survivor = vi.fn();

    const unregister = register({ depth: 0, dismiss: gone });
    unregister();
    register({ depth: 0, dismiss: survivor });
    unregister();

    expect(dismissInnermost()).toBe(true);
    expect(survivor).toHaveBeenCalledTimes(1);
    expect(gone).not.toHaveBeenCalled();
  });
});

describe('the document listener', () => {
  it('attaches on the first surface and detaches only when the last one goes', async () => {
    const { register } = await freshModule();

    const closeA = register({ depth: 0, dismiss: vi.fn() });
    const closeB = register({ depth: 1, dismiss: vi.fn() });
    expect(addEventListener).toHaveBeenCalledTimes(1);

    closeB();
    expect(removeEventListener).not.toHaveBeenCalled();

    closeA();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('is registered in the capture phase', async () => {
    // Capture, so an un-migrated handler that stops propagation can't prevent
    // the innermost surface from closing.
    const { register } = await freshModule();
    register({ depth: 0, dismiss: vi.fn() });

    expect(addEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      true,
    );
  });

  it('dismisses on Escape and ignores every other key', async () => {
    const { register } = await freshModule();
    const dismiss = vi.fn();
    register({ depth: 0, dismiss });

    keydown?.({ key: 'Enter' });
    keydown?.({ key: 'Tab' });
    expect(dismiss).not.toHaveBeenCalled();

    keydown?.({ key: 'Escape' });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
