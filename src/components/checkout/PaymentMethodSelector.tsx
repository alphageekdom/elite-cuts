'use client';

import { useEffect, useState } from 'react';

import { useCheckoutContext, type PayMethod } from '@/context/CheckoutContext';
import { formatBrand, isCardExpired } from '@/lib/payments/card-display';
import { useSavedCards } from '@/hooks/useSavedCards';
import CheckoutCardForm from './CheckoutCardForm';

const LockIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-2.75 w-2.75'
  >
    <rect x='3' y='11' width='18' height='11' rx='2' />
    <path d='M7 11V7a5 5 0 0110 0v4' />
  </svg>
);

const ALL_PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: 'card', label: 'Card' },
  { id: 'stripe', label: 'Stripe' },
];

const PayMethodIcon = ({ id }: { id: PayMethod }) => {
  if (id === 'card') {
    return (
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        aria-hidden='true'
        className='h-4.5 w-4.5'
      >
        <rect x='2' y='5' width='20' height='14' rx='2' />
        <line x1='2' y1='10' x2='22' y2='10' />
      </svg>
    );
  }
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      aria-hidden='true'
      className='h-4.5 w-4.5'
    >
      <path d='M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.423-.977 1.667 0 3.379.642 4.558 1.22l.665-4.084C16.685 3.755 15.067 3 12.491 3 10.673 3 9.158 3.476 8.077 4.359c-1.127.93-1.71 2.272-1.71 3.892 0 2.939 1.795 4.195 4.728 5.262 1.881.684 2.513 1.169 2.513 1.916 0 .724-.617 1.142-1.738 1.142-1.396 0-3.69-.685-5.189-1.561l-.674 4.137C8.318 19.93 10.275 21 12.475 21c1.916 0 3.515-.453 4.602-1.31 1.214-.953 1.844-2.366 1.844-4.094 0-2.987-1.823-4.226-4.442-5.213z' />
    </svg>
  );
};

type Props = {
  // True when the checkout page rendered with a signed-in user. The Save card
  // checkbox under the Stripe tile only appears for logged-in shoppers — guests
  // have no user record for a card to attach to.
  isLoggedIn?: boolean;
  // Resolved by the server component from the ENABLE_DEMO_CARD_TILE env var.
  // When false, the no-charge Card tile is hidden and the in-app saved-cards
  // strip stays empty — Stripe's hosted page is the only payment surface.
  demoCardEnabled?: boolean;
};

const PaymentMethodSelector = ({
  isLoggedIn = false,
  demoCardEnabled = false,
}: Props) => {
  // When the demo Card tile is gated off, only the Stripe tile shows. The
  // server-side check in /api/checkout/session is the actual lock — this just
  // keeps the UI honest so a shopper can't pick a tile that the API will
  // refuse.
  const PAY_METHODS = demoCardEnabled
    ? ALL_PAY_METHODS
    : ALL_PAY_METHODS.filter((m) => m.id !== 'card');
  // Skip the fetch when the demo Card tile is gated off — picking a saved
  // card routes through that path, and without it the strip should stay
  // empty (Stripe's hosted page handles saved-card pay).
  const { cards: savedCards } = useSavedCards({
    enabled: isLoggedIn && demoCardEnabled,
  });

  const { state, dispatch } = useCheckoutContext();
  const method = state.paymentMethod;
  const [cardFormValid, setCardFormValid] = useState(false);

  useEffect(() => {
    const ready =
      method === 'stripe' ||
      (method === 'card' && (Boolean(state.selectedSavedCardId) || cardFormValid));
    dispatch({ type: 'SET_PAYMENT_READY', payload: ready });
  }, [method, state.selectedSavedCardId, cardFormValid, dispatch]);

  // Switching tile clears any saved-card selection. The Stripe tile gets its
  // saved cards on Stripe's hosted page (via the customer link wired in the
  // session route), so a saved-card pick here only makes sense for the Card
  // tile's demo path.
  const setMethodAndClearSavedCard = (m: PayMethod) => {
    if (state.selectedSavedCardId) {
      dispatch({ type: 'SET_SELECTED_SAVED_CARD', payload: null });
    }
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: m });
  };

  return (
    <div className='rounded-sm border border-line-soft bg-paper px-5 py-7 sm:px-8 sm:py-8'>
      <div className='mb-7 flex items-baseline justify-between gap-4'>
        <span className='font-display text-[22px] font-medium tracking-tight'>
          Payment
        </span>
        <span className='inline-flex items-center gap-1.5 text-[12px] text-muted'>
          <LockIcon />
          Encrypted by Stripe
        </span>
      </div>

      {savedCards.length > 0 && (
        <div className='mb-6'>
          <p className='mb-2.5 text-[11px] uppercase tracking-[0.14em] text-muted'>
            Use a saved card
          </p>
          <div className='flex flex-wrap gap-2'>
            {savedCards.map((card) => {
              const selected = state.selectedSavedCardId === card.id;
              const expired = isCardExpired(card.expMonth, card.expYear);
              return (
                <button
                  key={card.id}
                  type='button'
                  disabled={expired}
                  onClick={() =>
                    dispatch({
                      type: 'SET_SELECTED_SAVED_CARD',
                      payload: selected ? null : card.id,
                    })
                  }
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-[12px] transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? 'border-ink bg-ink text-cream'
                      : 'border-line bg-cream text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  <span className='font-medium'>{formatBrand(card.brand)}</span>
                  <span className='font-mono'>•••• {card.last4}</span>
                  <span className='text-[11px] opacity-70'>
                    {expired ? 'Expired' : `Exp ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`mb-6 grid gap-2 ${PAY_METHODS.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {PAY_METHODS.map(({ id, label }) => {
          // aria-pressed tracks the actual payment method (saved-card pay
          // routes through the Card path, so the Card tile is genuinely
          // "pressed" then — even though its visual highlight is dimmed in
          // favour of the compact "Paying with…" card below).
          const isPaymentPath = method === id;
          const showsHighlight = isPaymentPath && !state.selectedSavedCardId;
          return (
            <button
              key={id}
              type='button'
              onClick={() => setMethodAndClearSavedCard(id)}
              aria-pressed={isPaymentPath}
              className={`inline-flex items-center justify-center gap-1.5 rounded-sm border px-2 py-3 text-[12px] font-medium transition-[background-color,border-color,color] duration-300 sm:gap-2 sm:px-3 sm:py-3.5 sm:text-[13px] motion-reduce:transition-none ${
                showsHighlight
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line bg-cream text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              <PayMethodIcon id={id} />
              {label}
            </button>
          );
        })}
      </div>

      {method === 'card' && state.selectedSavedCardId && (() => {
        const picked = savedCards.find((c) => c.id === state.selectedSavedCardId);
        if (!picked) return null;
        return (
          <div className='rounded-sm border border-ink bg-cream px-5 py-5'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-display text-[16px] font-medium tracking-tight'>
                  Paying with {formatBrand(picked.brand)}{' '}
                  <span className='font-mono'>•••• {picked.last4}</span>
                </p>
                {picked.cardholderName && (
                  <p className='mt-1 text-[12px] uppercase tracking-[0.08em] text-muted'>
                    {picked.cardholderName}
                  </p>
                )}
                <p className='mt-1 text-[13px] text-ink-soft'>
                  Exp{' '}
                  <span className='font-mono'>
                    {String(picked.expMonth).padStart(2, '0')}/
                    {String(picked.expYear).slice(-2)}
                  </span>
                </p>
              </div>
              <button
                type='button'
                onClick={() =>
                  dispatch({ type: 'SET_SELECTED_SAVED_CARD', payload: null })
                }
                className='text-[12px] tracking-[0.08em] uppercase text-muted hover:text-ink transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
              >
                Change
              </button>
            </div>
          </div>
        );
      })()}

      {method === 'card' && !state.selectedSavedCardId && (
        <CheckoutCardForm
          isLoggedIn={isLoggedIn}
          onValidityChange={setCardFormValid}
        />
      )}

      {method === 'stripe' && (
        <div className='rounded-sm border border-line bg-cream px-5 py-6'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <span className='font-display text-[15px] font-medium tracking-tight text-ink'>
              Pay with Stripe
            </span>
            <span className='inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted'>
              <LockIcon />
              Secure redirect
            </span>
          </div>
          <p className='text-[13px] leading-relaxed text-ink-soft'>
            You&apos;ll be sent to Stripe&apos;s secure checkout page to
            complete your payment. Stripe supports{' '}
            <span className='text-ink'>credit and debit cards</span>, and
            wallets like{' '}
            <span className='text-ink'>Apple Pay</span> and{' '}
            <span className='text-ink'>Google Pay</span> on supported devices.
          </p>
          <p className='mt-3 text-[12px] text-muted'>
            Card details are never collected or stored on EliteCuts.
          </p>
          {isLoggedIn && (
            <label className='mt-4 flex cursor-pointer items-start gap-2.5 border-t border-line pt-4 text-[13px] text-ink-soft'>
              <input
                type='checkbox'
                checked={state.saveCard}
                onChange={(e) =>
                  dispatch({ type: 'SET_SAVE_CARD', payload: e.target.checked })
                }
                className='mt-0.5 h-3.5 w-3.5 cursor-pointer accent-ink'
              />
              <span>
                Save this card for next time
                <span className='mt-0.5 block text-[11px] text-muted'>
                  Available in your profile under Payment methods.
                </span>
              </span>
            </label>
          )}
        </div>
      )}

    </div>
  );
};

export default PaymentMethodSelector;
