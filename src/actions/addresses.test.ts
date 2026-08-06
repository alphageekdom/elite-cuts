import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── What this covers ────────────────────────────────────────────────────
//
// The four address server actions, which had no test. Removing BOTH the
// "a customer's first address is always their default" invariant AND the
// delete action's auth gate passed typecheck, all 1199 tests and lint.
//
// On that auth gate, stated precisely rather than dramatically: removing it is
// NOT an authentication bypass. `getAuthedUserId` returns null for an
// anonymous caller, and Mongoose's `findById(null)` is
// `findOne({ _id: null })` (model.js:2169) — a real filter that matches no
// document, so the request falls into the "user not found" branch and still
// changes nothing. The gate earns its place by answering the accurate error
// and by not depending on that downstream behaviour, which is why it is pinned
// here as defence in depth.
//
// The default-address invariant is the substantive half. It is what makes a
// brand-new customer's single address usable at checkout without them ever
// choosing one.

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  findById: vi.fn(),
  revalidatePath: vi.fn(),
  connectDB: vi.fn(async () => undefined),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/config/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/models/User', () => ({ default: { findById: mocks.findById } }));

import {
  addAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from './addresses';

type Addr = {
  _id: { toString: () => string };
  label: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

const addr = (id: string, over: Partial<Addr> = {}): Addr => ({
  _id: { toString: () => id },
  label: `Label ${id}`,
  address1: '1 Main St',
  city: 'San Diego',
  state: 'CA',
  zip: '92101',
  isDefault: false,
  ...over,
});

// Mongoose DocumentArray stand-in: a real array plus the two methods the
// actions call on it. `pull` and `id` are the only ones used.
const addressList = (items: Addr[]) => {
  const list = items as Addr[] & {
    id: (id: string) => Addr | undefined;
    pull: (id: string) => void;
  };
  list.id = (id) => list.find((a) => a._id.toString() === id);
  list.pull = (id) => {
    const i = list.findIndex((a) => a._id.toString() === id);
    if (i >= 0) list.splice(i, 1);
  };
  return list;
};

const userWith = (items: Addr[]) => ({
  addresses: addressList(items),
  save: vi.fn(async () => undefined),
});

const form = (over: Record<string, unknown> = {}) =>
  ({
    label: 'Home',
    address1: '742 Evergreen Terrace',
    address2: '',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
    isDefault: false,
    ...over,
  }) as never;

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.connectDB.mockResolvedValue(undefined);
  mocks.getSessionUser.mockResolvedValue({ userId: 'user-1' });
});

describe('every address action refuses an anonymous caller', () => {
  // Defence in depth — see the note at the top of this file for why this is
  // not an auth bypass on its own. The distinct message matters: "Unauthorized"
  // tells the client to sign in, "User not found" would not.
  it.each([
    ['addAddress', () => addAddress(form())],
    ['updateAddress', () => updateAddress('a1', form())],
    ['deleteAddress', () => deleteAddress('a1')],
    ['setDefaultAddress', () => setDefaultAddress('a1')],
  ] as const)('%s', async (_name, run) => {
    mocks.getSessionUser.mockResolvedValue(null);

    await expect(run()).resolves.toEqual({
      success: false,
      error: 'Unauthorized',
    });
    // Nothing is even looked up, let alone written.
    expect(mocks.findById).not.toHaveBeenCalled();
  });
});

describe('addAddress', () => {
  it('marks a customer’s very first address as their default', async () => {
    // The invariant. Without it a new customer has addresses but no default,
    // and checkout has nothing to pre-select.
    const user = userWith([]);
    mocks.findById.mockResolvedValue(user);

    await addAddress(form({ isDefault: false }));

    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0].isDefault).toBe(true);
  });

  it('leaves a later address non-default unless asked', async () => {
    const user = userWith([addr('a1', { isDefault: true })]);
    mocks.findById.mockResolvedValue(user);

    await addAddress(form({ isDefault: false }));

    expect(user.addresses.map((a) => a.isDefault)).toEqual([true, false]);
  });

  it('demotes the previous default when the new one claims it', async () => {
    const user = userWith([addr('a1', { isDefault: true }), addr('a2')]);
    mocks.findById.mockResolvedValue(user);

    await addAddress(form({ isDefault: true }));

    expect(user.addresses.map((a) => a.isDefault)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('trims every field and drops a blank unit line', async () => {
    const user = userWith([]);
    mocks.findById.mockResolvedValue(user);

    await addAddress(
      form({
        label: '  Home  ',
        address1: ' 1 Main St ',
        address2: '   ',
        city: ' SD ',
      }),
    );

    expect(user.addresses[0]).toMatchObject({
      label: 'Home',
      address1: '1 Main St',
      city: 'SD',
    });
    // Blank-after-trim becomes undefined, not an empty string, so the stored
    // document has no unit line at all.
    expect(user.addresses[0].address2).toBeUndefined();
  });

  it('keeps a real unit line', async () => {
    const user = userWith([]);
    mocks.findById.mockResolvedValue(user);

    await addAddress(form({ address2: '  Apt 4B ' }));

    expect(user.addresses[0].address2).toBe('Apt 4B');
  });

  it('saves and refreshes the profile page', async () => {
    const user = userWith([]);
    mocks.findById.mockResolvedValue(user);

    await expect(addAddress(form())).resolves.toEqual({ success: true });
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/profile');
  });

  it('reports a failed write instead of throwing', async () => {
    const user = userWith([]);
    user.save.mockRejectedValue(new Error('mongo exploded'));
    mocks.findById.mockResolvedValue(user);

    const result = await addAddress(form());

    expect(result).toEqual({ success: false, error: 'Failed to add address' });
    // The thrown detail stays out of the client-facing message.
    expect(JSON.stringify(result)).not.toContain('mongo exploded');
  });

  it('reports a missing user without writing', async () => {
    mocks.findById.mockResolvedValue(null);

    await expect(addAddress(form())).resolves.toEqual({
      success: false,
      error: 'User not found',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateAddress', () => {
  it('edits only the targeted address', async () => {
    const user = userWith([addr('a1', { isDefault: true }), addr('a2')]);
    mocks.findById.mockResolvedValue(user);

    await updateAddress('a2', form({ label: 'Work', city: 'Encinitas' }));

    expect(user.addresses[1]).toMatchObject({
      label: 'Work',
      city: 'Encinitas',
    });
    expect(user.addresses[0].label).toBe('Label a1');
  });

  it('demotes the previous default when this one claims it', async () => {
    const user = userWith([addr('a1', { isDefault: true }), addr('a2')]);
    mocks.findById.mockResolvedValue(user);

    await updateAddress('a2', form({ isDefault: true }));

    expect(user.addresses.map((a) => a.isDefault)).toEqual([false, true]);
  });

  it('refuses an address id the customer does not own', async () => {
    const user = userWith([addr('a1')]);
    mocks.findById.mockResolvedValue(user);

    await expect(updateAddress('someone-elses', form())).resolves.toEqual({
      success: false,
      error: 'Address not found',
    });
    expect(user.save).not.toHaveBeenCalled();
  });
});

describe('deleteAddress', () => {
  it('removes only the targeted address', async () => {
    const user = userWith([addr('a1'), addr('a2'), addr('a3')]);
    mocks.findById.mockResolvedValue(user);

    await deleteAddress('a2');

    expect(user.addresses.map((a) => a._id.toString())).toEqual(['a1', 'a3']);
  });

  // Otherwise deleting the default leaves the customer with addresses but no
  // default — the same broken state the addAddress invariant exists to prevent.
  it('promotes the first survivor when the default is deleted', async () => {
    const user = userWith([
      addr('a1', { isDefault: true }),
      addr('a2'),
      addr('a3'),
    ]);
    mocks.findById.mockResolvedValue(user);

    await deleteAddress('a1');

    expect(user.addresses.map((a) => a.isDefault)).toEqual([true, false]);
  });

  it('does not reshuffle defaults when a non-default is deleted', async () => {
    const user = userWith([addr('a1'), addr('a2', { isDefault: true })]);
    mocks.findById.mockResolvedValue(user);

    await deleteAddress('a1');

    expect(user.addresses.map((a) => [a._id.toString(), a.isDefault])).toEqual([
      ['a2', true],
    ]);
  });

  it('deletes the last address without trying to promote anything', async () => {
    const user = userWith([addr('a1', { isDefault: true })]);
    mocks.findById.mockResolvedValue(user);

    await expect(deleteAddress('a1')).resolves.toEqual({ success: true });
    expect(user.addresses).toHaveLength(0);
  });

  // Deliberately unlike `setDefaultAddress`, which refuses an unknown id. The
  // asymmetry is the point and is pinned so a later tidy-up does not
  // "harmonise" the two: a delete that finds nothing has already achieved what
  // it was asked to do, and reporting success is the conventional idempotent
  // answer. Set-default is different because a missing target there makes it
  // destroy state — it clears the existing default — so it has to refuse.
  it('reports success for an id that is already gone, changing nothing', async () => {
    const user = userWith([addr('a1', { isDefault: true }), addr('a2')]);
    mocks.findById.mockResolvedValue(user);

    await expect(deleteAddress('already-deleted')).resolves.toEqual({
      success: true,
    });
    expect(user.addresses.map((a) => [a._id.toString(), a.isDefault])).toEqual([
      ['a1', true],
      ['a2', false],
    ]);
  });
});

describe('setDefaultAddress', () => {
  it('moves the default and leaves exactly one', async () => {
    const user = userWith([
      addr('a1', { isDefault: true }),
      addr('a2'),
      addr('a3'),
    ]);
    mocks.findById.mockResolvedValue(user);

    await setDefaultAddress('a3');

    expect(user.addresses.map((a) => a.isDefault)).toEqual([
      false,
      false,
      true,
    ]);
  });

  // Was a real bug, found while writing these tests and fixed on the same
  // branch: without the existence check the loop cleared every default and
  // saved it, so the customer kept their addresses with none pre-selected at
  // checkout while the UI toasted "Default address updated". Reachable from a
  // stale page — delete an address in one tab and another tab still holds its
  // id.
  it('refuses an id that matches nothing, leaving the existing default alone', async () => {
    const user = userWith([addr('a1', { isDefault: true }), addr('a2')]);
    mocks.findById.mockResolvedValue(user);

    const result = await setDefaultAddress('no-such-id');

    expect(result).toEqual({ success: false, error: 'Address not found' });
    expect(user.addresses.map((a) => a.isDefault)).toEqual([true, false]);
    expect(user.save).not.toHaveBeenCalled();
  });
});
