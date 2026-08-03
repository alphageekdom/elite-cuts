'use client';

import { useEffect, useState } from 'react';

import { useCheckoutContext } from '@/context/CheckoutContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { formatShopAddress } from '@/lib/shop-settings/format';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';
import type { PickupDay } from '@/lib/shop-settings/pickup-slots';
import { BLOCK_LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm';
import { DELIVERY_RADIUS_MILES } from '@/lib/shop-settings/config';
import { DELIVERY_FEE } from '@/lib/checkout/totals';

type FulfillmentToggleProps = {
  // Built on the server from real shop hours — see pickup-slots.ts for why
  // this isn't derived here.
  pickupDays: PickupDay[];
  // Why today isn't among them, when it isn't. Null on an ordinary day.
  todayNote: string | null;
};

const FulfillmentToggle = ({
  pickupDays,
  todayNote,
}: FulfillmentToggleProps) => {
  const { state, dispatch } = useCheckoutContext();
  const { fulfillment, pickupSlot } = state;
  const shopSettings = useShopSettings();
  const shopAddress = formatShopAddress(shopSettings);

  const [selectedDayId, setSelectedDayId] = useState(pickupDays[0]?.id ?? '');

  // Derived, not synced: if the selection no longer matches a day the server
  // sent, the first one wins rather than leaving the grid pointing at nothing.
  const activeDay =
    pickupDays.find((day) => day.id === selectedDayId) ?? pickupDays[0];

  // Keep context holding a slot that actually exists on the visible day, so
  // the POST body can never carry a window from a day the customer moved off.
  useEffect(() => {
    if (fulfillment !== 'pickup' || !activeDay) return;
    const stillValid = activeDay.slots.some((slot) => slot.id === pickupSlot);
    if (!stillValid) {
      dispatch({ type: 'SET_PICKUP_SLOT', payload: activeDay.slots[0].id });
    }
  }, [fulfillment, pickupSlot, activeDay, dispatch]);

  const effectiveSlot =
    activeDay?.slots.some((slot) => slot.id === pickupSlot) === true
      ? pickupSlot
      : (activeDay?.slots[0]?.id ?? '');

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
              FREE · {formatReadyIn(shopSettings.leadTime).toUpperCase()}
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
            {/* Was "${DELIVERY_FEE} · SAME DAY". Delivery has no schedule
                anywhere in the app — no cutoff, no day picker, and no field on
                `Order` recording when a delivery is due — so the shop could
                neither honour nor even check that claim. The pickup tile beside
                this one earns its timing line from `buildPickupDays`; this one
                had nothing behind it. Do not restore a timing line here without
                delivery scheduling to back it. */}
            <div
              className={`mt-1.5 font-mono text-[11px] tracking-[0.04em] ${
                fulfillment === 'delivery' ? 'text-camel-soft' : 'text-muted'
              }`}
            >
              ${DELIVERY_FEE} DELIVERY FEE
            </div>
          </div>
        </button>
      </div>

      {fulfillment === 'pickup' &&
        (activeDay ? (
          <div>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
              <label className={`${BLOCK_LABEL_CLASS} mb-0`} id='pickup-time-label'>
                Pickup time
              </label>
              {pickupDays.length > 1 ? (
                <div
                  role='group'
                  aria-label='Pickup day'
                  className='flex flex-wrap gap-2'
                >
                  {pickupDays.map((day) => {
                    const isActive = day.id === activeDay.id;
                    return (
                      <button
                        key={day.id}
                        type='button'
                        aria-pressed={isActive}
                        onClick={() => setSelectedDayId(day.id)}
                        className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-[12px] transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                          isActive
                            ? 'border-camel-deep bg-camel/12 text-camel-deeper'
                            : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                        }`}
                      >
                        {day.relativeLabel} · {day.dateLabel}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className='text-[12px] text-muted'>
                  {activeDay.relativeLabel} · {activeDay.dateLabel}
                </span>
              )}
            </div>

            {todayNote && (
              <p className='mb-3 text-[12px] text-muted'>{todayNote}</p>
            )}

            <div
              role='group'
              aria-labelledby='pickup-time-label'
              className='mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4'
            >
              {activeDay.slots.map((slot) => {
                const isSelected = effectiveSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() =>
                      dispatch({ type: 'SET_PICKUP_SLOT', payload: slot.id })
                    }
                    className={`rounded-sm border px-2.5 py-3 text-center transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                      isSelected
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
                      {isSelected ? 'SELECTED' : 'OPEN'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Only reachable when the shop has no open day in the next week —
          // every window past is handled by rolling to the next open day. On
          // the live hours (6 of 7 days open) this branch never renders, which
          // is why the wording below went unexamined for so long.
          //
          // It used to say "Choose local delivery". That was steering people
          // toward the one fulfilment path with no schedule behind it, at
          // exactly the times the shop is least able to serve it. Delivery is
          // still selectable — it is a tile right above — but it is no longer
          // recommended as the answer to "pickup is unavailable", because
          // nothing about delivery is time-bound either.
          <p className='mb-8 text-[13px] text-muted'>
            No pickup windows are open at the moment. Give the shop a call and
            we&apos;ll sort a time.
          </p>
        ))}

      {fulfillment === 'delivery' && <DeliveryAddressForm />}
    </div>
  );
};

export default FulfillmentToggle;
