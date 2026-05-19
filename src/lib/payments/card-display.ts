// Display helpers for saved cards + the in-flight card form. Shared between
// the checkout payment selector and the profile payment-methods tab so a
// Visa ending 4242 reads identically on both surfaces. Validation thresholds
// stay in the components themselves — the two surfaces ask slightly different
// things of the cardholder name and these are display-shape helpers only.

export type SavedCardSummary = {
  id: string;
  cardholderName?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

// Normalises any of the typical brand strings (lowercase, mixed case,
// "american express") to a consistent display label. Visa/Mastercard/Discover
// land title-cased; Amex stays as "Amex" rather than the longer form because
// every saved-card UI in the app reads better that way.
export const formatBrand = (brand: string): string => {
  const lower = brand.toLowerCase();
  if (lower === 'amex' || lower === 'american express') return 'Amex';
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
};

// Groups the digits of a card-number value into 4-digit blocks separated by
// spaces, capped at 16 digits. Strips non-digits first so paste-from-anywhere
// works. The trailing-edge regex keeps the last partial group ungrouped
// (e.g. "1234 1" rather than "1234 1 ").
export const formatCardNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// "MM/YY" — the conventional expiry display across receipts, wallets, and
// payment-method rows. Years > 99 are sliced to their last two digits.
export const formatExpiry = (month: number, year: number): string => {
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
};

// Conventional masked-PAN display — three dot groups plus the visible last4,
// matching Stripe / Apple Pay / wallet UI conventions. The first twelve
// digits never leave the form so there's nothing to show.
export const maskedNumber = (last4: string): string => `•••• •••• •••• ${last4}`;

// True when the card's (month, year) has already passed. Treated as "first
// day of the month after expiry": a Dec 2025 card is valid through Dec 31
// 2025 and expired starting Jan 1 2026.
export const isCardExpired = (month: number, year: number): boolean => {
  const now = new Date();
  return year * 12 + (month - 1) < now.getFullYear() * 12 + now.getMonth();
};
