import { EMAIL_RE } from '@/lib/validation';
import type { CheckoutState } from '@/context/CheckoutContext';

// Two characters, not five. The old floor blocked real short names — "A Li",
// "Bo Ng" — from checking out entirely, which is a hard stop rather than a
// nudge. The point of the check is to catch an empty or single-character
// entry, and two does that without deciding whose name is long enough.
export const isNameValid = (name: string): boolean => name.trim().length >= 2;
export const isEmailValid = (email: string): boolean => EMAIL_RE.test(email.trim());
export const isPhoneValid = (phone: string): boolean => phone.replace(/\D/g, '').length >= 10;

export const isContactComplete = (state: Pick<CheckoutState, 'contactName' | 'contactEmail' | 'contactPhone'>): boolean =>
  isNameValid(state.contactName) &&
  isEmailValid(state.contactEmail) &&
  isPhoneValid(state.contactPhone);
