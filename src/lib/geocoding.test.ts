import { describe, expect, it } from 'vitest';

import {
  buildDeliveryGeocodeQuery,
  formatPhotonSuggestion,
  isWithinDeliveryRadius,
  type PhotonFeature,
} from './geocoding';
import { SHOP_LAT, SHOP_LNG } from '@/lib/shop-settings/config';

describe('buildDeliveryGeocodeQuery', () => {
  it('builds a street-level query', () => {
    expect(
      buildDeliveryGeocodeQuery({
        address1: '4720 Adams Ave',
        city: 'San Diego',
        state: 'CA',
        zip: '92116',
      }),
    ).toBe('4720 Adams Ave, San Diego, CA 92116');
  });

  it('never carries a unit number into the query', () => {
    // The regression this helper exists for. Nominatim resolves the street but
    // returns nothing for "4720 Adams Ave Apt 4B", so including the unit meant
    // every apartment dweller was told their address could not be found and
    // could not place a delivery order. The parameter type omits `address2`,
    // so the only way to reintroduce it is deliberately.
    const query = buildDeliveryGeocodeQuery({
      address1: '4720 Adams Ave',
      city: 'San Diego',
      state: 'CA',
      zip: '92116',
    });
    expect(query).not.toMatch(/apt|unit|suite|#/i);
  });

  it('falls back to CA when the state is blank', () => {
    expect(
      buildDeliveryGeocodeQuery({
        address1: '1 Market St',
        city: 'San Diego',
        state: '',
        zip: '92101',
      }),
    ).toBe('1 Market St, San Diego, CA 92101');
  });
});

describe('isWithinDeliveryRadius', () => {
  it('accepts the shop itself', () => {
    expect(isWithinDeliveryRadius(SHOP_LAT, SHOP_LNG)).toBe(true);
  });

  it('accepts a nearby address', () => {
    // Normal Heights, a few miles from the counter.
    expect(isWithinDeliveryRadius(32.7620185, -117.0920477)).toBe(true);
  });

  it('rejects an address well outside the radius', () => {
    // Los Angeles — ~120 miles north, comfortably past any plausible radius.
    expect(isWithinDeliveryRadius(34.0522, -118.2437)).toBe(false);
  });

  it('is symmetric about the shop', () => {
    // Same distance north and south should agree, catching a sign error in the
    // haversine that a single one-sided assertion would miss.
    const delta = 0.05;
    expect(isWithinDeliveryRadius(SHOP_LAT + delta, SHOP_LNG)).toBe(
      isWithinDeliveryRadius(SHOP_LAT - delta, SHOP_LNG),
    );
  });
});

describe('formatPhotonSuggestion', () => {
  const feature = (properties: PhotonFeature['properties']): PhotonFeature => ({
    properties,
    geometry: { coordinates: [-117.1, 32.7] },
  });

  it('joins house number and street with the locality', () => {
    expect(
      formatPhotonSuggestion(
        feature({
          housenumber: '4720',
          street: 'Adams Ave',
          city: 'San Diego',
          state: 'CA',
          postcode: '92116',
        }),
      ),
      // Comma-separated throughout, unlike the geocode query's "CA 92116" —
      // this string is for the autocomplete dropdown, not a lookup.
    ).toBe('4720 Adams Ave, San Diego, CA, 92116');
  });

  it('falls back to the street alone when there is no house number', () => {
    expect(
      formatPhotonSuggestion(
        feature({ street: 'Adams Ave', city: 'San Diego', state: 'CA' }),
      ),
    ).toBe('Adams Ave, San Diego, CA');
  });

  it('falls back to the place name when there is no street', () => {
    expect(
      formatPhotonSuggestion(feature({ name: 'Balboa Park', city: 'San Diego' })),
    ).toBe('Balboa Park, San Diego');
  });

  it('drops missing parts rather than leaving empty separators', () => {
    expect(formatPhotonSuggestion(feature({ street: 'Adams Ave' }))).toBe(
      'Adams Ave',
    );
  });
});
