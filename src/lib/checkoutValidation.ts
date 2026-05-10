import { EMAIL_RE } from '@/lib/validation';
import type { CheckoutState } from '@/context/CheckoutContext';

export const isNameValid = (name: string): boolean => name.trim().length >= 5;
export const isEmailValid = (email: string): boolean => EMAIL_RE.test(email.trim());
export const isPhoneValid = (phone: string): boolean => phone.replace(/\D/g, '').length >= 10;

export const isContactComplete = (state: Pick<CheckoutState, 'contactName' | 'contactEmail' | 'contactPhone'>): boolean =>
  isNameValid(state.contactName) &&
  isEmailValid(state.contactEmail) &&
  isPhoneValid(state.contactPhone);
