import { EMAIL_RE } from '@/lib/validation';

// Structural rather than importing `CheckoutState` from the context: lib
// should not depend on a component-tree module, and these only ever needed a
// few fields. `src/lib/cart/counts.ts` answers the same question the same way.
type ContactFields = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

type AddressFields = {
  address1: string;
  city: string;
  state: string;
  zip: string;
};

// Two characters, not five. The old floor blocked real short names — "A Li",
// "Bo Ng" — from checking out entirely, which is a hard stop rather than a
// nudge. The point of the check is to catch an empty or single-character
// entry, and two does that without deciding whose name is long enough.
export const isNameValid = (name: string): boolean => name.trim().length >= 2;
export const isEmailValid = (email: string): boolean => EMAIL_RE.test(email.trim());
export const isPhoneValid = (phone: string): boolean => phone.replace(/\D/g, '').length >= 10;

export const isContactComplete = (state: ContactFields): boolean =>
  isNameValid(state.contactName) &&
  isEmailValid(state.contactEmail) &&
  isPhoneValid(state.contactPhone);

// Every field a courier actually needs. `address2` is deliberately absent —
// a unit number is optional, and requiring it would block houses.
export const isDeliveryAddressComplete = (address: AddressFields): boolean =>
  address.address1.trim().length >= 3 &&
  address.city.trim().length >= 2 &&
  address.state.trim().length === 2 &&
  /^\d{5}(-\d{4})?$/.test(address.zip.trim());

// Whether a delivery order may be submitted.
//
// 'error' passes on purpose: it means the geocoder couldn't be reached, not
// that the address is undeliverable, and holding checkout hostage to a
// third-party outage is worse than accepting an address the shop can refuse
// by phone. 'idle' and 'checking' do NOT pass — an unanswered check is not a
// pass, and both resolve on their own within a second.
export const isDeliveryReady = (state: {
  deliveryAddress: AddressFields;
  deliveryCheck: string;
}): boolean =>
  isDeliveryAddressComplete(state.deliveryAddress) &&
  (state.deliveryCheck === 'valid' || state.deliveryCheck === 'error');

// The whole fulfillment-side gate, so the button and any future caller agree.
//
// The pickup branch used to be a bare `true`, which let a slotless pickup order
// through: the POST simply omitted `pickupSlot`, and the server's slot check was
// itself behind `if (body.pickupSlot)` so it never ran. Both halves are closed —
// this one so the button explains itself, the server one because a client is not
// a security boundary.
//
// Delivery deliberately requires no slot: it has no schedule anywhere in the
// app. That asymmetry is the honest state of the feature, not an oversight.
export const isFulfillmentReady = (state: {
  fulfillment: string;
  pickupSlot: string;
  deliveryAddress: AddressFields;
  deliveryCheck: string;
}): boolean =>
  state.fulfillment === 'delivery'
    ? isDeliveryReady(state)
    : state.pickupSlot.trim().length > 0;
