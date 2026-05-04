'use client';

import { useEffect, useRef, useState } from 'react';

import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';

const LABEL = `mb-2.5 block ${LABEL_CLASS}`;

type DeliveryCheck = 'idle' | 'checking' | 'valid' | 'invalid' | 'error';

type PhotonFeature = {
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

const STATE_ABBR: Record<string, string> = {
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

const SHOP_LAT = 32.7491;
const SHOP_LNG = -117.1294;
const RADIUS_MILES = 25;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

const fetchSuggestions = async (query: string): Promise<PhotonFeature[]> => {
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

const geocodeAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EliteCuts/1.0 (luisasoto87@gmail.com)',
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

const DeliveryAddressForm = () => {
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [zip, setZip] = useState('');
  const [deliveryCheck, setDeliveryCheck] = useState<DeliveryCheck>('idle');
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (address1.trim().length < 4) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      const results = await fetchSuggestions(address1);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [address1]);

  const checkDeliveryRadius = async () => {
    if (!address1.trim() || !city.trim() || zip.length < 5) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
    setDeliveryCheck('checking');
    const query = `${address1}${address2 ? ` ${address2}` : ''}, ${city}, ${addressState || 'CA'} ${zip}`;
    const coords = await geocodeAddress(query);
    checkingRef.current = false;
    if (!coords) { setDeliveryCheck('error'); return; }
    const miles = haversineDistance(SHOP_LAT, SHOP_LNG, coords.lat, coords.lon);
    setDeliveryCheck(miles <= RADIUS_MILES ? 'valid' : 'invalid');
  };

  // Auto-check when all fields are filled — catches autofill extensions that
  // set values programmatically without triggering blur events.
  useEffect(() => {
    if (address1.trim().length < 5 || city.trim().length < 2 || zip.length < 5) return;
    const timeout = setTimeout(() => void checkDeliveryRadius(), 800);
    return () => clearTimeout(timeout);
    // checkDeliveryRadius omitted from deps intentionally — it reads fresh state
    // via closure and including it would cause infinite loops via checkingRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address1, city, zip, addressState]);

  const selectSuggestion = (feature: PhotonFeature) => {
    const { housenumber, street, name, city: c, state: s, postcode } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    setAddress1(housenumber && street ? `${housenumber} ${street}` : (street ?? name ?? ''));
    setCity(c ?? '');
    setAddressState(s ? (STATE_ABBR[s] ?? s.slice(0, 2).toUpperCase()) : '');
    setZip(postcode ?? '');
    setSuggestions([]);
    setShowSuggestions(false);
    const miles = haversineDistance(SHOP_LAT, SHOP_LNG, lat, lon);
    setDeliveryCheck(miles <= RADIUS_MILES ? 'valid' : 'invalid');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length < 3) return;
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts.slice(2).join(' ').trim();
    const zipMatch = stateZip.match(/\d{5}/);
    const zip = zipMatch ? zipMatch[0] : '';
    const stateRaw = stateZip.replace(/\d{5}(-\d{4})?/, '').trim();
    const state = STATE_ABBR[stateRaw] ?? stateRaw.slice(0, 2).toUpperCase();
    if (!street || !city) return;
    e.preventDefault();
    setAddress1(street);
    setCity(city);
    setAddressState(state);
    setZip(zip);
    setShowSuggestions(false);
    setDeliveryCheck('idle');
  };

  const formatSuggestion = (f: PhotonFeature): string => {
    const { housenumber, street, name, city, state, postcode } = f.properties;
    const line1 = housenumber && street ? `${housenumber} ${street}` : (street ?? name ?? '');
    return [line1, city, state, postcode].filter(Boolean).join(', ');
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      void checkDeliveryRadius();
    }
  };

  return (
    <div className='mb-8 flex flex-col gap-6' onBlur={handleBlur}>
      <div className='relative' ref={suggestionRef}>
        <div className='mb-2.5 flex items-center justify-between'>
          <label htmlFor='address1' className={LABEL}>Street address</label>
          {address1.trim().length >= 5 && <CheckoutFieldCheck />}
        </div>
        <input
          id='address1'
          type='text'
          name='address1'
          value={address1}
          onChange={(e) => { setAddress1(e.target.value); setDeliveryCheck('idle'); }}
          onPaste={handlePaste}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder='Start typing or paste a full address…'
          autoComplete='address-line1'
          className={FIELD_CLASS}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className='absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-sm border border-line bg-paper shadow-md'>
            {suggestions.map((f, i) => (
              <li key={i}>
                <button
                  type='button'
                  onMouseDown={() => selectSuggestion(f)}
                  className='w-full px-4 py-3 text-left text-[13px] text-ink transition-colors duration-150 hover:bg-cream-deep'
                >
                  {formatSuggestion(f)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor='address2' className={LABEL}>
          Apt, suite, etc.{' '}
          <span className='ml-2 text-[11px] font-normal normal-case tracking-normal opacity-70'>optional</span>
        </label>
        <input
          id='address2'
          type='text'
          name='address2'
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          placeholder='Apt 4B'
          autoComplete='address-line2'
          className={FIELD_CLASS}
        />
      </div>

      <div className='grid grid-cols-2 gap-3.5 sm:grid-cols-[2fr_1fr_1fr]'>
        <div className='col-span-2 sm:col-span-1'>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='city' className={LABEL}>City</label>
            {city.trim().length >= 2 && <CheckoutFieldCheck />}
          </div>
          <input
            id='city'
            type='text'
            name='city'
            value={city}
            onChange={(e) => { setCity(e.target.value); setDeliveryCheck('idle'); }}
            placeholder='San Diego'
            autoComplete='address-level2'
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='state' className={LABEL}>State</label>
            {addressState.length === 2 && <CheckoutFieldCheck />}
          </div>
          <input
            id='state'
            type='text'
            name='state'
            value={addressState}
            onChange={(e) => setAddressState(e.target.value.toUpperCase())}
            placeholder='CA'
            autoComplete='address-level1'
            maxLength={2}
            className={`${FIELD_CLASS} uppercase`}
          />
        </div>
        <div>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='zip' className={LABEL}>ZIP</label>
            {deliveryCheck === 'valid' && <CheckoutFieldCheck />}
          </div>
          <input
            id='zip'
            type='text'
            name='zip'
            value={zip}
            onChange={(e) => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setDeliveryCheck('idle'); }}
            placeholder='92104'
            autoComplete='postal-code'
            inputMode='numeric'
            maxLength={5}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      {deliveryCheck === 'checking' && (
        <p className='text-[13px] text-muted'>Checking delivery availability…</p>
      )}
      {deliveryCheck === 'valid' && (
        <p className='flex items-center gap-2 text-[13px] text-green'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.5} aria-hidden='true' className='h-3.5 w-3.5 shrink-0'>
            <polyline points='20 6 9 17 4 12' />
          </svg>
          Great news — this address is within our delivery area.
        </p>
      )}
      {deliveryCheck === 'invalid' && (
        <p className='flex items-center gap-2 text-[13px] text-oxblood'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0'>
            <circle cx='12' cy='12' r='10' />
            <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
          </svg>
          We can&apos;t deliver to this address — it&apos;s outside our 25-mile radius. Select pickup instead.
        </p>
      )}
      {deliveryCheck === 'error' && (
        <p className='flex items-center gap-2 text-[13px] text-oxblood'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0'>
            <circle cx='12' cy='12' r='10' />
            <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
          </svg>
          We couldn&apos;t find that address. Please enter a valid street address.
        </p>
      )}
    </div>
  );
};

export default DeliveryAddressForm;
