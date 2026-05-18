'use client';

import { useEffect, useMemo } from 'react';

import { useCheckoutContext } from '@/context/CheckoutContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { formatShopAddress } from '@/lib/shopSettingsFormat';
import { BLOCK_LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm';
import { DELIVERY_RADIUS_MILES } from '@/lib/shopConfig';

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

const FulfillmentToggle = () => {
  const { state, dispatch } = useCheckoutContext();
  const { fulfillment, pickupSlot } = state;
  const shopSettings = useShopSettings();
  const shopAddress = formatShopAddress(shopSettings);

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

  // Persist the auto-selected slot to context so the POST body always includes it
  useEffect(() => {
    if (fulfillment !== 'pickup' || pickupSlot) return;
    const firstAvailable = slots.find((s) => !s.past);
    if (firstAvailable) {
      dispatch({ type: 'SET_PICKUP_SLOT', payload: firstAvailable.id });
    }
  }, [fulfillment, pickupSlot, slots, dispatch]);

  const effectiveSlot = pickupSlot || (slots.find((s) => !s.past)?.id ?? '');

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
          onClick={() => dispatch({ type: 'SET_FULFILLMENT', payload: 'pickup' })}
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
              {shopAddress}
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
          onClick={() => dispatch({ type: 'SET_FULFILLMENT', payload: 'delivery' })}
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
              Within {DELIVERY_RADIUS_MILES} miles of the shop
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
          <label className={BLOCK_LABEL_CLASS}>
            Pickup time · {todayLabel}
          </label>
          <div className='mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {slots.map((slot) => {
              const isSelected = effectiveSlot === slot.id;
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
                  onClick={() => dispatch({ type: 'SET_PICKUP_SLOT', payload: slot.id })}
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

      {fulfillment === 'delivery' && <DeliveryAddressForm />}
    </div>
  );
};

export default FulfillmentToggle;
