// Card brand inference from BIN (Bank Identification Number — the leading
// digits of the PAN). Real production code would prefer the brand returned by
// the card network on tokenisation, but our demo Card-tile never talks to a
// network — these ranges cover the four brands the shop accepts cleanly
// enough to label saved cards correctly.
//
// Source: ISO/IEC 7812 + each network's published BIN ranges as of 2024.
export const brandFromBin = (rawDigits: string): string => {
  const digits = rawDigits.replace(/\D/g, '');
  if (digits.length === 0) return 'Card';

  // Amex: 34, 37
  const two = parseInt(digits.slice(0, 2), 10);
  if (two === 34 || two === 37) return 'Amex';

  // Visa: 4
  if (digits[0] === '4') return 'Visa';

  // Mastercard: 51-55 or 2221-2720
  if (two >= 51 && two <= 55) return 'Mastercard';
  if (digits.length >= 4) {
    const four = parseInt(digits.slice(0, 4), 10);
    if (four >= 2221 && four <= 2720) return 'Mastercard';
  }

  // Discover: 6011, 622126-622925, 644-649, 65
  if (two === 65) return 'Discover';
  if (digits.length >= 3) {
    const three = parseInt(digits.slice(0, 3), 10);
    if (three >= 644 && three <= 649) return 'Discover';
  }
  if (digits.length >= 4 && digits.slice(0, 4) === '6011') return 'Discover';
  if (digits.length >= 6) {
    const six = parseInt(digits.slice(0, 6), 10);
    if (six >= 622126 && six <= 622925) return 'Discover';
  }

  return 'Card';
};
