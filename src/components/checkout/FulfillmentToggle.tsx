'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useCheckoutContext } from '@/context/CheckoutContext';
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

const fetchSuggestions = async (query: string): Promise<PhotonFeature[]> => {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = (await res.json()) as { features: PhotonFeature[] };
    return (data.features ?? []).filter(
      (f) => f.properties.country === 'United States',
    );
  } catch {
    return [];
  }
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

const geocodeAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
};

const FieldCheck = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.5}
    aria-hidden='true'
    className='h-3.5 w-3.5 shrink-0 text-green'
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
);

const SLOT_DEFINITIONS = [
  { id: '10-11a', label: '10–11a', startHour: 10 },
  { id: '11a-12p', label: '11a–12p', startHour: 11, spots: 5 },
  { id: '12-1p', label: '12–1p', startHour: 12 },
  { id: '1-2p', label: '1–2p', startHour: 13 },
  { id: '2-3p', label: '2–3p', startHour: 14 },
  { id: '3-4p', label: '3–4p', startHour: 15 },
  { id: '4-5p', label: '4–5p', startHour: 16 },
  { id: '5-6p', label: '5–6p', startHour: 17 },
] as const;

const FIELD_CLASS =
  'w-full border-b border-line bg-transparent pb-3.5 pt-2 text-[16px] text-ink outline-none placeholder:text-muted/60 transition-[border-color] duration-300 focus:border-b-oxblood motion-reduce:transition-none';

const LABEL_CLASS =
  'mb-2.5 block text-[11px] font-medium uppercase tracking-[0.22em] text-muted';

const FulfillmentToggle = () => {
  const { fulfillment, setFulfillment } = useCheckoutContext();
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
    // Match "123 Main St, City, ST 12345" or "123 Main St, City, ST, 12345"
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

  // Auto-check when all fields are filled — catches filler extensions that
  // set values programmatically without triggering blur events.
  useEffect(() => {
    if (fulfillment !== 'delivery') return;
    if (address1.trim().length < 5 || city.trim().length < 2 || zip.length < 5) return;
    const timeout = setTimeout(() => void checkDeliveryRadius(), 800);
    return () => clearTimeout(timeout);
    // checkDeliveryRadius omitted from deps intentionally — it reads fresh state
    // via closure and including it would cause infinite loops via checkingRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address1, city, zip, addressState, fulfillment]);

  const handleDeliveryBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      void checkDeliveryRadius();
    }
  };

  const currentHour = useMemo(() => new Date().getHours(), []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [],
  );

  const slots = useMemo(
    () =>
      SLOT_DEFINITIONS.map((s) => ({
        ...s,
        past: currentHour >= s.startHour,
      })),
    [currentHour],
  );

  const [selectedSlot, setSelectedSlot] = useState<string>(
    () => slots.find((s) => !s.past)?.id ?? '',
  );

  return (
    <div className='rounded-sm border border-line-soft bg-paper px-5 py-7 sm:px-8 sm:py-8'>
      <div className='mb-7'>
        <span className='font-display text-[22px] font-medium tracking-tight'>
          How you&apos;d like it
        </span>
      </div>

      <div className='mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <button
          type='button'
          onClick={() => setFulfillment('pickup')}
          aria-pressed={fulfillment === 'pickup'}
          className={`flex items-start gap-3.5 rounded-sm border px-5 py-5 text-left transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
            fulfillment === 'pickup'
              ? 'border-ink bg-ink text-cream'
              : 'border-line bg-cream text-ink hover:border-ink'
          }`}
        >
          <span
            className={`relative mt-0.5 h-4.5 w-4.5 shrink-0 rounded-full border transition-colors duration-300 motion-reduce:transition-none ${
              fulfillment === 'pickup'
                ? 'border-cream bg-cream'
                : 'border-line bg-paper'
            }`}
          >
            {fulfillment === 'pickup' && (
              <span className='absolute inset-1 rounded-full bg-ink' />
            )}
          </span>
          <div>
            <div className='mb-1 font-display text-[17px] font-medium tracking-tight'>
              Pickup at shop
            </div>
            <div
              className={`text-[12px] leading-relaxed ${
                fulfillment === 'pickup' ? 'text-cream/65' : 'text-muted'
              }`}
            >
              3045 30th St · North Park, SD
            </div>
            <div
              className={`mt-1.5 font-mono text-[11px] tracking-[0.04em] ${
                fulfillment === 'pickup' ? 'text-camel-soft' : 'text-green'
              }`}
            >
              FREE · ~1 HOUR
            </div>
          </div>
        </button>

        <button
          type='button'
          onClick={() => setFulfillment('delivery')}
          aria-pressed={fulfillment === 'delivery'}
          className={`flex items-start gap-3.5 rounded-sm border px-5 py-5 text-left transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
            fulfillment === 'delivery'
              ? 'border-ink bg-ink text-cream'
              : 'border-line bg-cream text-ink hover:border-ink'
          }`}
        >
          <span
            className={`relative mt-0.5 h-4.5 w-4.5 shrink-0 rounded-full border transition-colors duration-300 motion-reduce:transition-none ${
              fulfillment === 'delivery'
                ? 'border-cream bg-cream'
                : 'border-line bg-paper'
            }`}
          >
            {fulfillment === 'delivery' && (
              <span className='absolute inset-1 rounded-full bg-ink' />
            )}
          </span>
          <div>
            <div className='mb-1 font-display text-[17px] font-medium tracking-tight'>
              Local delivery
            </div>
            <div
              className={`text-[12px] leading-relaxed ${
                fulfillment === 'delivery' ? 'text-cream/65' : 'text-muted'
              }`}
            >
              Within 25 miles of the shop
            </div>
            <div
              className={`mt-1.5 font-mono text-[11px] tracking-[0.04em] ${
                fulfillment === 'delivery' ? 'text-camel-soft' : 'text-muted'
              }`}
            >
              $8 · SAME DAY
            </div>
          </div>
        </button>
      </div>

      {fulfillment === 'pickup' && (
        <div>
          <label className={LABEL_CLASS}>
            Pickup time · {todayLabel}
          </label>
          <div className='mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              const meta = slot.past
                ? 'PAST'
                : isSelected
                  ? 'SELECTED'
                  : 'spots' in slot
                    ? `${slot.spots} LEFT`
                    : 'OPEN';

              return (
                <button
                  key={slot.id}
                  type='button'
                  disabled={slot.past}
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`rounded-sm border px-2.5 py-3 text-center transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                    slot.past
                      ? 'cursor-not-allowed border-line opacity-35'
                      : isSelected
                        ? 'border-ink bg-ink text-cream'
                        : 'border-line bg-cream text-ink hover:border-ink'
                  }`}
                >
                  <div className='mb-0.5 font-display text-[14px] font-medium'>
                    {slot.label}
                  </div>
                  <div
                    className={`text-[10px] tracking-[0.08em] ${
                      isSelected ? 'text-cream/65' : 'text-muted'
                    }`}
                  >
                    {meta}
                  </div>
                </button>
              );
            })}
          </div>

          {slots.every((s) => s.past) && (
            <p className='mb-6 text-[13px] text-muted'>
              Pickup orders are no longer available for today. Please check back
              tomorrow.
            </p>
          )}
        </div>
      )}

      {fulfillment === 'delivery' && (
        <div className='mb-8 flex flex-col gap-6' onBlur={handleDeliveryBlur}>
          <div className='relative' ref={suggestionRef}>
            <div className='mb-2.5 flex items-center justify-between'>
              <label htmlFor='address1' className={LABEL_CLASS}>
                Street address
              </label>
              {address1.trim().length >= 5 && <FieldCheck />}
            </div>
            <input
              id='address1'
              type='text'
              name='address1'
              value={address1}
              onChange={(e) => {
                setAddress1(e.target.value);
                setDeliveryCheck('idle');
              }}
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
            <label htmlFor='address2' className={LABEL_CLASS}>
              Apt, suite, etc.{' '}
              <span className='ml-2 text-[11px] font-normal normal-case tracking-normal opacity-70'>
                optional
              </span>
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
                <label htmlFor='city' className={LABEL_CLASS}>
                  City
                </label>
                {city.trim().length >= 2 && <FieldCheck />}
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
                <label htmlFor='state' className={LABEL_CLASS}>
                  State
                </label>
                {addressState.length === 2 && <FieldCheck />}
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
                <label htmlFor='zip' className={LABEL_CLASS}>
                  ZIP
                </label>
                {deliveryCheck === 'valid' && <FieldCheck />}
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
            <p className='text-[13px] text-muted'>
              Checking delivery availability…
            </p>
          )}
          {deliveryCheck === 'valid' && (
            <p className='flex items-center gap-2 text-[13px] text-green'>
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2.5}
                aria-hidden='true'
                className='h-3.5 w-3.5 shrink-0'
              >
                <polyline points='20 6 9 17 4 12' />
              </svg>
              Great news — this address is within our delivery area.
            </p>
          )}
          {deliveryCheck === 'invalid' && (
            <p className='flex items-center gap-2 text-[13px] text-oxblood'>
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                aria-hidden='true'
                className='h-3.5 w-3.5 shrink-0'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
              We can&apos;t deliver to this address — it&apos;s outside our
              25-mile radius. Select pickup instead.
            </p>
          )}
          {deliveryCheck === 'error' && (
            <p className='flex items-center gap-2 text-[13px] text-oxblood'>
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                aria-hidden='true'
                className='h-3.5 w-3.5 shrink-0'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
              We couldn&apos;t find that address. Please enter a valid street
              address.
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor='notes' className={LABEL_CLASS}>
          Notes for the butcher{' '}
          <span className='ml-2 text-[11px] font-normal normal-case tracking-normal opacity-70'>
            optional
          </span>
        </label>
        <textarea
          id='notes'
          name='notes'
          rows={2}
          placeholder='Any special cutting requests, doneness preferences, or pickup notes…'
          className='w-full resize-y border-b border-line bg-transparent pb-3.5 pt-2 text-[16px] text-ink outline-none placeholder:text-muted/60 transition-[border-color] duration-300 focus:border-b-oxblood motion-reduce:transition-none'
        />
      </div>
    </div>
  );
};

export default FulfillmentToggle;
