// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ── What this covers ────────────────────────────────────────────────────
// The one piece of logic this card owns: which toast it raises after a reset,
// and what it says. The route it calls decides the `message`; the card decides
// whether the admin sees a success or a WARNING, and it computes that itself
// from `ratingRecomputeFailures` — so the route's own tests cannot see it.
//
// Why that matters: this button is the manual recovery path after a nightly run
// misbehaved. A flat success here is what sends an admin away believing the
// repair worked when some ratings are still stale.
//
// Needs the jsdom tier (see vitest.config.ts) rather than the static-render
// one — the toast is raised from an async click handler, so nothing short of a
// real event and a settled promise reaches it.

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  useSession: vi.fn(),
  isDemoAdmin: vi.fn(() => false),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));
vi.mock('next-auth/react', () => ({ useSession: mocks.useSession }));
vi.mock('@/lib/auth/demo-permissions', () => ({
  isDemoAdmin: mocks.isDemoAdmin,
}));

import DemoResetCard from './DemoResetCard';

let container: HTMLDivElement;
let root: Root;

/** Only the fields the card reads when building its summary. */
const counts = (ratingRecomputeFailures: number) => ({
  userReset: true,
  ordersDeleted: 6,
  ordersSeeded: 6,
  productsRestored: 39,
  ratingRecomputeFailures,
});

const respondWith = (body: unknown, ok = true) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, json: async () => body })),
  );
};

const clickText = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!button) throw new Error(`no button labelled "${label}"`);
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

/** Open the confirm, then accept it, letting the fetch promise settle. */
const runReset = async () => {
  await clickText('Reset demo data');
  await clickText('Yes, reset');
};

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.isDemoAdmin.mockReturnValue(false);
  mocks.useSession.mockReturnValue({ data: { user: { isAdmin: true } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<DemoResetCard />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('after a reset that partly failed', () => {
  beforeEach(() => {
    respondWith({
      data: counts(3),
      message: 'ignored — the card builds its own',
    });
  });

  it('warns instead of reporting success', async () => {
    await runReset();

    expect(mocks.warning).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('says how many ratings failed, and to run it again', async () => {
    await runReset();

    const text = String(mocks.warning.mock.calls[0][0]);
    expect(text).toContain('3 ratings could not be recomputed');
    expect(text).toContain('run it again');
    // The counts still have to be there — the admin needs to see the reset ran.
    expect(text).toContain('39 cuts restored');
  });

  it('singularises a lone failure', async () => {
    respondWith({ data: counts(1) });
    await runReset();

    expect(String(mocks.warning.mock.calls[0][0])).toContain(
      '1 rating could not be recomputed',
    );
  });
});

describe('after a clean reset', () => {
  it('reports a plain success with no warning', async () => {
    respondWith({ data: counts(0) });

    await runReset();

    expect(mocks.success).toHaveBeenCalledTimes(1);
    expect(mocks.warning).not.toHaveBeenCalled();
    expect(String(mocks.success.mock.calls[0][0])).toContain(
      '6 orders cleared',
    );
  });
});

describe('when the request itself fails', () => {
  it('raises an error toast and neither of the other two', async () => {
    respondWith({ message: 'Something went wrong' }, false);

    await runReset();

    expect(mocks.error).toHaveBeenCalledWith('Something went wrong');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.warning).not.toHaveBeenCalled();
  });
});

describe('demo admin', () => {
  it('never sees the card, so it cannot reset its own session', () => {
    mocks.isDemoAdmin.mockReturnValue(true);
    act(() => root.render(<DemoResetCard />));

    expect(container.textContent).toBe('');
  });
});
