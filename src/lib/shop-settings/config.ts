export const SHOP_LAT = 32.7491;
export const SHOP_LNG = -117.1294;
export const DELIVERY_RADIUS_MILES = 25;
export const NOMINATIM_USER_AGENT = 'EliteCuts/1.0 (contact@elitecuts.com)';

// Per-line cart cap. Covers a dinner party / holiday gathering, blocks
// wholesale-style buys. The phrase "Limit N per item" in the API error
// messages is parsed by the cart UI — keep that wording stable.
export const MAX_PER_LINE = 10;

// At or below this many units a cut is called out as running low, on the
// catalog card and again on its cart line. Shared so the two can't disagree
// about when the customer starts seeing a number — a cut that read "3 left"
// on the card must not go quiet once it's in the cart.
export const LOW_STOCK_THRESHOLD = 5;
