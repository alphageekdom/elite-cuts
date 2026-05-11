export const SHOP_ADDRESS = '3045 30th Street';
export const SHOP_CITY_STATE = 'San Diego, CA';
export const SHOP_ZIP = '92104';
export const SHOP_CITY_STATE_ZIP = `${SHOP_CITY_STATE} ${SHOP_ZIP}`;
export const SHOP_ADDRESS_DISPLAY = `${SHOP_ADDRESS} · ${SHOP_CITY_STATE}`;
export const SHOP_ADDRESS_FULL = `${SHOP_ADDRESS}, ${SHOP_CITY_STATE}`;
export const SHOP_ADDRESS_FULL_WITH_ZIP = `${SHOP_ADDRESS}, ${SHOP_CITY_STATE_ZIP}`;
export const SHOP_PHONE = '(619) 555-0142';
export const SHOP_PHONE_HREF = 'tel:+16195550142';
export const SHOP_LAT = 32.7491;
export const SHOP_LNG = -117.1294;
export const DELIVERY_RADIUS_MILES = 25;
export const NOMINATIM_USER_AGENT = 'EliteCuts/1.0 (contact@elitecuts.com)';

// Per-line cart cap. Covers a dinner party / holiday gathering, blocks
// wholesale-style buys. The phrase "Limit N per item" in the API error
// messages is parsed by the cart UI — keep that wording stable.
export const MAX_PER_LINE = 10;
