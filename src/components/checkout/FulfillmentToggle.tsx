'use client';

import { useMemo, useState } from 'react';

import { useCheckoutContext } from '@/context/CheckoutContext';
import { LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm';

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

const FT_LABEL_CLASS = `mb-2.5 block ${LABEL_CLASS}`;

const FulfillmentToggle = () => {
  const { fulfillment, setFulfillment } = useCheckoutContext();

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
          <label className={FT_LABEL_CLASS}>
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

      {fulfillment === 'delivery' && <DeliveryAddressForm />}

      <div>
        <label htmlFor='notes' className={FT_LABEL_CLASS}>
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
