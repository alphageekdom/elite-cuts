import { describe, it, expect } from 'vitest';

import {
  isContactComplete,
  isDeliveryAddressComplete,
  isDeliveryReady,
  isEmailValid,
  isFulfillmentReady,
  isNameValid,
  isPhoneValid,
} from './validation';

const address = {
  address1: '2100 Fern St',
  city: 'San Diego',
  state: 'CA',
  zip: '92104',
};

const pickup = {
  fulfillment: 'pickup',
  pickupSlot: '2026-08-04T16:00',
  deliveryAddress: address,
  deliveryCheck: 'idle',
};

const delivery = { ...pickup, fulfillment: 'delivery', pickupSlot: '', deliveryCheck: 'valid' };

describe('isFulfillmentReady — pickup', () => {
  // The bug this closes: the pickup branch was a bare `true`, so an order with
  // no slot passed the button, the POST omitted `pickupSlot`, and the server's
  // own slot check sat behind `if (body.pickupSlot)` and never ran. The counter
  // got an order it had no time for.
  it('refuses a pickup order with no slot', () => {
    expect(isFulfillmentReady({ ...pickup, pickupSlot: '' })).toBe(false);
  });

  it('refuses a slot that is only whitespace', () => {
    expect(isFulfillmentReady({ ...pickup, pickupSlot: '   ' })).toBe(false);
  });

  it('accepts a pickup order carrying a slot', () => {
    expect(isFulfillmentReady(pickup)).toBe(true);
  });

  // Pickup must not inherit the delivery gate. A pickup order has no address to
  // complete and no radius to check, so an empty address and an unanswered
  // geocode are both irrelevant to it.
  it('ignores the delivery address and radius check', () => {
    expect(
      isFulfillmentReady({
        ...pickup,
        deliveryAddress: { address1: '', city: '', state: '', zip: '' },
        deliveryCheck: 'invalid',
      }),
    ).toBe(true);
  });
});

describe('isFulfillmentReady — delivery', () => {
  // Deliberate asymmetry, not an oversight: delivery has no schedule anywhere
  // in the app — no cutoff, no picker, and no field on Order recording a time —
  // so requiring a slot for it would block a path the shop does support.
  it('does not require a pickup slot', () => {
    expect(isFulfillmentReady({ ...delivery, pickupSlot: '' })).toBe(true);
  });

  it('still requires a complete address', () => {
    expect(
      isFulfillmentReady({ ...delivery, deliveryAddress: { ...address, zip: '' } }),
    ).toBe(false);
  });

  it.each([
    ['valid', true],
    // A geocoder outage is not an undeliverable address; blocking checkout on a
    // third-party being down is worse than accepting one the shop can refuse.
    ['error', true],
    ['invalid', false],
    // An unanswered check is not a pass. Both resolve within a second.
    ['idle', false],
    ['checking', false],
  ])('treats deliveryCheck=%s as ready=%s', (check, ready) => {
    expect(isFulfillmentReady({ ...delivery, deliveryCheck: check })).toBe(ready);
    expect(isDeliveryReady({ deliveryAddress: address, deliveryCheck: check })).toBe(ready);
  });
});

describe('contact field rules', () => {
  // Two characters, not five — the old floor hard-stopped real short names.
  it.each([
    ['A Li', true],
    ['Bo', true],
    ['B', false],
    ['  ', false],
  ])('isNameValid(%s) === %s', (name, ok) => {
    expect(isNameValid(name)).toBe(ok);
  });

  it.each([
    ['sam@example.com', true],
    ['sam@example', false],
    ['sam.example.com', false],
  ])('isEmailValid(%s) === %s', (email, ok) => {
    expect(isEmailValid(email)).toBe(ok);
  });

  it.each([
    ['(619) 555-0142', true],
    ['6195550142', true],
    ['555-0142', false],
  ])('isPhoneValid(%s) === %s', (phone, ok) => {
    expect(isPhoneValid(phone)).toBe(ok);
  });

  it('requires all three together', () => {
    const contact = {
      contactName: 'Sam Reyes',
      contactEmail: 'sam@example.com',
      contactPhone: '6195550142',
    };
    expect(isContactComplete(contact)).toBe(true);
    expect(isContactComplete({ ...contact, contactPhone: '555' })).toBe(false);
  });
});

describe('isDeliveryAddressComplete', () => {
  it('accepts a complete address', () => {
    expect(isDeliveryAddressComplete(address)).toBe(true);
  });

  // address2 is deliberately absent from the rule — requiring a unit number
  // would block houses, and the 2026-07-25 fix established that the unit must
  // never reach the geocoder either.
  it('does not require a unit number', () => {
    expect(isDeliveryAddressComplete({ ...address })).toBe(true);
  });

  it.each([
    [{ ...address, address1: 'A' }, 'a too-short street'],
    [{ ...address, state: 'California' }, 'a spelled-out state'],
    [{ ...address, zip: '9210' }, 'a four-digit zip'],
  ])('rejects %#: %s', (bad) => {
    expect(isDeliveryAddressComplete(bad)).toBe(false);
  });

  it('accepts a ZIP+4', () => {
    expect(isDeliveryAddressComplete({ ...address, zip: '92104-1234' })).toBe(true);
  });
});
