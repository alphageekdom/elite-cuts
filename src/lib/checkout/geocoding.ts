import { SHOP_LAT, SHOP_LNG, DELIVERY_RADIUS_MILES, NOMINATIM_USER_AGENT } from '@/lib/shop-settings/config';

export type PhotonFeature = {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
};

export const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export const isWithinDeliveryRadius = (lat: number, lon: number): boolean =>
  haversineDistance(SHOP_LAT, SHOP_LNG, lat, lon) <= DELIVERY_RADIUS_MILES;

// Street-level query for the delivery radius check. The parameter type has no
// `address2` on purpose: geocoders resolve streets, not units, and Nominatim
// returns nothing at all for "4720 Adams Ave Apt 4B" while resolving the same
// address without the unit — which silently blocked every apartment dweller
// from ordering delivery. Omitting the field from the type keeps a well-meaning
// caller from passing it back in. The unit still rides along on the order
// itself; it just isn't a lookup key.
export const buildDeliveryGeocodeQuery = (address: {
  address1: string;
  city: string;
  state: string;
  zip: string;
}): string =>
  `${address.address1}, ${address.city}, ${address.state || 'CA'} ${address.zip}`;

export const fetchSuggestions = async (query: string): Promise<PhotonFeature[]> => {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = (await res.json()) as { features: PhotonFeature[] };
    return (data.features ?? []).filter((f) => f.properties.country === 'United States');
  } catch {
    return [];
  }
};

export const geocodeAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_USER_AGENT,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
};

export const formatPhotonSuggestion = (f: PhotonFeature): string => {
  const { housenumber, street, name, city, state, postcode } = f.properties;
  const line1 = housenumber && street ? `${housenumber} ${street}` : (street ?? name ?? '');
  return [line1, city, state, postcode].filter(Boolean).join(', ');
};
