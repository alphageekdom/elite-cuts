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
// Needs the jsdom tier (see vitest.config.mts) rather than the static-render
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
const counts = (
  ratingRecomputeFailures: number,
  validationFailures: string[] = [],
) => ({
  userReset: true,
  ordersDeleted: 6,
  ordersSeeded: 6,
  productsRestored: 39,
  ratingRecomputeFailures,
  validationFailures,
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

describe('when post-run verification found a gap', () => {
  it('names the identifiers rather than counting them', async () => {
    // This button is the recovery path an admin reaches for after a bad
    // night. A count sends them to comb the dashboards; an identifier sends
    // them to the row.
    respondWith({ data: counts(0, ['product:dry-aged-ribeye', 'staff:Sam Okafor']) });
    await runReset();

    expect(mocks.warning).toHaveBeenCalledTimes(1);
    const text = String(mocks.warning.mock.calls[0][0]);
    expect(text).toContain('product:dry-aged-ribeye');
    expect(text).toContain('staff:Sam Okafor');
    expect(text).toContain('run it again');
    // The counts still ride along — the admin needs to see the reset ran.
    expect(text).toContain('39 cuts restored');
  });

  it('caps the list so a wholesale failure does not fill the screen', async () => {
    // Distinctive identifiers rather than single letters — the summary the
    // list is appended to already contains "cleared,", so a one-character
    // absence assertion matches the wrong half of the string.
    respondWith({
      data: counts(0, ['one:1', 'two:2', 'three:3', 'four:4', 'five:5']),
    });
    await runReset();

    const text = String(mocks.warning.mock.calls[0][0]);
    expect(text).toContain('one:1, two:2, three:3');
    expect(text).toContain('and 2 more');
    expect(text).not.toContain('four:4');
    expect(text).not.toContain('five:5');
  });

  it('outranks the rating warning when both are true', async () => {
    // A missing cut means the demo the next visitor opens is incomplete; a
    // stale star average does not. Only one toast fires, so it has to be the
    // more serious one.
    respondWith({ data: counts(3, ['promo:WELCOME10']) });
    await runReset();

    expect(mocks.warning).toHaveBeenCalledTimes(1);
    const text = String(mocks.warning.mock.calls[0][0]);
    expect(text).toContain('promo:WELCOME10');
    expect(text).not.toContain('could not be recomputed');
  });

  it('falls back to a plain success when the field is absent entirely', async () => {
    // An older deploy answering a newer card. Reading `.length` off undefined
    // would throw inside the click handler and the admin would see nothing at
    // all — worse than the missing warning.
    respondWith({
      data: { userReset: true, ordersDeleted: 6, ordersSeeded: 6, productsRestored: 39, ratingRecomputeFailures: 0 },
    });
    await runReset();

    expect(mocks.success).toHaveBeenCalledTimes(1);
    expect(mocks.warning).not.toHaveBeenCalled();
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
