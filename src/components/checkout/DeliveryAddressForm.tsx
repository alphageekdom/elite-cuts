'use client';

import { useEffect, useEffectEvent, useRef, useState, type ChangeEvent } from 'react';

import {
  useCheckoutContext,
  type DeliveryAddress,
  type SavedAddress,
} from '@/context/CheckoutContext';
import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import SavedAddressPicker from '@/components/checkout/SavedAddressPicker';
import { FIELD_CLASS, BLOCK_LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import {
  STATE_ABBR,
  fetchSuggestions,
  geocodeAddress,
  isWithinDeliveryRadius,
  formatPhotonSuggestion,
  type PhotonFeature,
} from '@/lib/geocoding';
import { DELIVERY_RADIUS_MILES } from '@/lib/shop-settings/config';

type DeliveryCheck = 'idle' | 'checking' | 'valid' | 'invalid' | 'error';

// Address fields are the source of truth on context — every input reads from
// `state.deliveryAddress` and writes via dispatch. This is what lets the
// pre-filled default address render on first paint without the form
// stomping it back to empties via a sync effect.
const DeliveryAddressForm = () => {
  const { state, dispatch } = useCheckoutContext();
  const { deliveryAddress, savedAddresses } = state;
  const { address1, address2, city, state: addressState, zip } = deliveryAddress;

  const [deliveryCheck, setDeliveryCheck] = useState<DeliveryCheck>('idle');
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Tracks whether the address1 input currently has focus. Gates the
  // autocomplete fetch so a pre-filled default address (or a saved-address
  // card click) doesn't pop the suggestions dropdown open on its own — only
  // a focused user typing should trigger suggestions.
  const [address1Focused, setAddress1Focused] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const checkingRef = useRef(false);

  const updateAddress = (patch: Partial<DeliveryAddress>) => {
    dispatch({
      type: 'SET_DELIVERY_ADDRESS',
      payload: { ...deliveryAddress, ...patch },
    });
  };

  const pickSavedAddress = (sa: SavedAddress) => {
    dispatch({
      type: 'SET_DELIVERY_ADDRESS',
      payload: {
        address1: sa.address1,
        address2: sa.address2,
        city: sa.city,
        state: sa.state,
        zip: sa.zip,
      },
    });
    setDeliveryCheck('idle');
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (!address1Focused) return;
    if (address1.trim().length < 4) return;
    const timeout = setTimeout(async () => {
      const results = await fetchSuggestions(address1);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [address1, address1Focused]);

  const checkDeliveryRadius = async () => {
    if (!address1.trim() || !city.trim() || zip.length < 5) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
    setDeliveryCheck('checking');
    const query = `${address1}${address2 ? ` ${address2}` : ''}, ${city}, ${addressState || 'CA'} ${zip}`;
    const coords = await geocodeAddress(query);
    checkingRef.current = false;
    if (!coords) { setDeliveryCheck('error'); return; }
    setDeliveryCheck(isWithinDeliveryRadius(coords.lat, coords.lon) ? 'valid' : 'invalid');
  };

  // `checkDeliveryRadius` closes over the address fields and setState, so it is a new
  // function every render. Listing it in the effect below would make this self-perpetuating:
  // the timer fires -> setDeliveryCheck('checking') -> re-render -> new identity -> effect
  // re-runs -> fresh timer -> geocode resolves -> setDeliveryCheck('valid') -> re-render ->
  // fresh timer -> ... i.e. a geocode request every 800ms forever. `checkingRef` does not
  // save us: it only blocks *concurrent* calls, and it's already cleared by the time the
  // next timer fires. The effect needs the latest function without reacting to it, which is
  // what an effect event is for.
  //
  // A wrapper rather than making checkDeliveryRadius itself an effect event, because
  // handleBlur below also calls it. At runtime an effect event only forbids being called
  // during render, so a handler would work — but the react-hooks lint rule rejects
  // referencing one outside an Effect, and that rule is the binding constraint here.
  const checkDeliveryRadiusFromDebounce = useEffectEvent(() => void checkDeliveryRadius());

  // Auto-check when all fields are filled — catches autofill extensions that
  // set values programmatically without triggering blur events.
  //
  // Deps are unchanged from before the effect-event refactor, deliberately. Note address2 is
  // read by the query above but is not listed here, so a unit number typed inside the 800ms
  // window rides along without having reset the timer. That's pre-existing (the blur path
  // always sent the latest address2 too) and is left alone here to keep this change
  // lint-only — see the delivery-geocode entry in context/deferred-findings.md.
  useEffect(() => {
    if (address1.trim().length < 5 || city.trim().length < 2 || zip.length < 5) return;
    const timeout = setTimeout(() => checkDeliveryRadiusFromDebounce(), 800);
    return () => clearTimeout(timeout);
  }, [address1, city, zip, addressState]);

  const selectSuggestion = (feature: PhotonFeature) => {
    const { housenumber, street, name, city: c, state: s, postcode } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    updateAddress({
      address1: housenumber && street ? `${housenumber} ${street}` : (street ?? name ?? ''),
      city: c ?? '',
      state: s ? (STATE_ABBR[s] ?? s.slice(0, 2).toUpperCase()) : '',
      zip: postcode ?? '',
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setDeliveryCheck(isWithinDeliveryRadius(lat, lon) ? 'valid' : 'invalid');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length < 3) return;
    const street = parts[0];
    const cityPart = parts[1];
    const stateZip = parts.slice(2).join(' ').trim();
    const zipMatch = stateZip.match(/\d{5}/);
    const zipPart = zipMatch ? zipMatch[0] : '';
    const stateRaw = stateZip.replace(/\d{5}(-\d{4})?/, '').trim();
    const statePart = STATE_ABBR[stateRaw] ?? stateRaw.slice(0, 2).toUpperCase();
    if (!street || !cityPart) return;
    e.preventDefault();
    updateAddress({ address1: street, city: cityPart, state: statePart, zip: zipPart });
    setShowSuggestions(false);
    setDeliveryCheck('idle');
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      void checkDeliveryRadius();
    }
  };

  const onChangeAddress1 = (e: ChangeEvent<HTMLInputElement>) => {
    updateAddress({ address1: e.target.value });
    setDeliveryCheck('idle');
  };
  const onChangeAddress2 = (e: ChangeEvent<HTMLInputElement>) => {
    updateAddress({ address2: e.target.value });
  };
  const onChangeCity = (e: ChangeEvent<HTMLInputElement>) => {
    updateAddress({ city: e.target.value });
    setDeliveryCheck('idle');
  };
  const onChangeState = (e: ChangeEvent<HTMLInputElement>) => {
    updateAddress({ state: e.target.value.toUpperCase() });
  };
  const onChangeZip = (e: ChangeEvent<HTMLInputElement>) => {
    updateAddress({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) });
    setDeliveryCheck('idle');
  };

  return (
    <div className='mb-8 flex flex-col gap-6' onBlur={handleBlur}>
      <SavedAddressPicker
        savedAddresses={savedAddresses}
        currentAddress={deliveryAddress}
        onPick={pickSavedAddress}
      />

      <div className='relative' ref={suggestionRef}>
        <div className='mb-2.5 flex items-center justify-between'>
          <label htmlFor='address1' className={BLOCK_LABEL_CLASS}>Street address</label>
          {address1.trim().length >= 5 && <CheckoutFieldCheck />}
        </div>
        <input
          id='address1'
          type='text'
          name='address1'
          value={address1}
          onChange={onChangeAddress1}
          onPaste={handlePaste}
          onFocus={() => {
            setAddress1Focused(true);
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setAddress1Focused(false);
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder='Start typing or paste a full address…'
          autoComplete='address-line1'
          className={FIELD_CLASS}
        />
        {showSuggestions && suggestions.length > 0 && address1.trim().length >= 4 && (
          <ul className='absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-sm border border-line bg-paper shadow-md'>
            {suggestions.map((f, i) => (
              <li key={i}>
                <button
                  type='button'
                  onMouseDown={() => selectSuggestion(f)}
                  className='w-full px-4 py-3 text-left text-[13px] text-ink transition-colors duration-150 hover:bg-cream-deep'
                >
                  {formatPhotonSuggestion(f)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor='address2' className={BLOCK_LABEL_CLASS}>
          Apt, suite, etc.{' '}
          <span className='ml-2 text-[11px] font-normal normal-case tracking-normal opacity-70'>optional</span>
        </label>
        <input
          id='address2'
          type='text'
          name='address2'
          value={address2}
          onChange={onChangeAddress2}
          placeholder='Apt 4B'
          autoComplete='address-line2'
          className={FIELD_CLASS}
        />
      </div>

      <div className='grid grid-cols-2 gap-3.5 sm:grid-cols-[2fr_1fr_1fr]'>
        <div className='col-span-2 sm:col-span-1'>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='city' className={BLOCK_LABEL_CLASS}>City</label>
            {city.trim().length >= 2 && <CheckoutFieldCheck />}
          </div>
          <input
            id='city'
            type='text'
            name='city'
            value={city}
            onChange={onChangeCity}
            placeholder='San Diego'
            autoComplete='address-level2'
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='state' className={BLOCK_LABEL_CLASS}>State</label>
            {addressState.length === 2 && <CheckoutFieldCheck />}
          </div>
          <input
            id='state'
            type='text'
            name='state'
            value={addressState}
            onChange={onChangeState}
            placeholder='CA'
            autoComplete='address-level1'
            maxLength={2}
            className={`${FIELD_CLASS} uppercase`}
          />
        </div>
        <div>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='zip' className={BLOCK_LABEL_CLASS}>ZIP</label>
            {deliveryCheck === 'valid' && <CheckoutFieldCheck />}
          </div>
          <input
            id='zip'
            type='text'
            name='zip'
            value={zip}
            onChange={onChangeZip}
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
          We can&apos;t deliver to this address — it&apos;s outside our {DELIVERY_RADIUS_MILES}-mile radius. Select pickup instead.
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
