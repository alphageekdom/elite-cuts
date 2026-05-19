'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { useCheckoutContext, type PayMethod } from '@/context/CheckoutContext';
import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import { brandFromBin } from '@/lib/payments/brand';
import {
  formatBrand,
  formatCardNumber,
  isCardExpired,
  type SavedCardSummary,
} from '@/lib/payments/card-display';

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
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [savedCards, setSavedCards] = useState<SavedCardSummary[]>([]);

  const yearRef = useRef<HTMLInputElement>(null);

  const { state, dispatch } = useCheckoutContext();
  const method = state.paymentMethod;

  const isNameValid = cardName.trim().length >= 5;
  const isCardNumberValid = cardNumber.replace(/\s/g, '').length === 16;
  const isMonthValid =
    month.length === 2 &&
    parseInt(month, 10) >= 1 &&
    parseInt(month, 10) <= 12;
  const isYearValid = year.length === 2 && parseInt(year, 10) >= new Date().getFullYear() % 100;
  const isExpiryValid = isMonthValid && isYearValid;
  const isCvcValid = cvc.length === 3;

  useEffect(() => {
    const ready =
      method === 'stripe' ||
      (method === 'card' &&
        (Boolean(state.selectedSavedCardId) ||
          (isNameValid &&
            isCardNumberValid &&
            isExpiryValid &&
            isCvcValid)));
    dispatch({ type: 'SET_PAYMENT_READY', payload: ready });
  }, [method, state.selectedSavedCardId, isNameValid, isCardNumberValid, isExpiryValid, isCvcValid, dispatch]);

  // Fetch the customer's saved cards once they're logged in so they show up
  // as one-click tiles above the manual Card/Stripe selector. Silently
  // tolerates a failed fetch (the manual form still works). Skipped entirely
  // when the demo Card tile is off — picking a saved card routes through the
  // demo path, and with that gated, Stripe's hosted page is the canonical
  // surface for saved-card pay.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!demoCardEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/payment-methods');
        if (!res.ok) return;
        const data = (await res.json()) as { cards: SavedCardSummary[] };
        if (!cancelled) setSavedCards(data.cards);
      } catch (err) {
        console.error('[PaymentMethodSelector] saved cards load failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, demoCardEnabled]);

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

  // Lift just the four display fields (brand from BIN, last4, month, year)
  // into context whenever the Card form is fully valid. The session route
  // reads these to write a SavedCard row after the demo order completes, so
  // a Visa ending 4242 typed at checkout shows up as "Visa ending 4242" in
  // the profile — not random stub data. Raw card number never leaves the
  // form. Cleared when the form goes invalid or the shopper switches tiles.
  useEffect(() => {
    if (method === 'card' && isNameValid && isCardNumberValid && isExpiryValid) {
      const digits = cardNumber.replace(/\s/g, '');
      dispatch({
        type: 'SET_CARD_DETAILS',
        payload: {
          cardholderName: cardName.trim(),
          brand: brandFromBin(digits),
          last4: digits.slice(-4),
          expMonth: parseInt(month, 10),
          expYear: 2000 + parseInt(year, 10),
        },
      });
    } else {
      dispatch({ type: 'SET_CARD_DETAILS', payload: null });
    }
  }, [method, cardName, cardNumber, month, year, isNameValid, isCardNumberValid, isExpiryValid, dispatch]);

  const onCardNumber = (e: ChangeEvent<HTMLInputElement>) =>
    setCardNumber(formatCardNumber(e.target.value));

  const onMonth = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    const num = parseInt(digits, 10);
    const clamped = digits.length === 2 && num > 12 ? '12' : digits;
    setMonth(clamped);
    if (clamped.length === 2) yearRef.current?.focus();
  };

  const onYear = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    const num = parseInt(digits, 10);
    const minYear = new Date().getFullYear() % 100;
    const clamped = digits.length === 2 && num < minYear ? String(minYear) : digits;
    setYear(clamped);
  };

  const onCvc = (e: ChangeEvent<HTMLInputElement>) =>
    setCvc(e.target.value.replace(/\D/g, '').slice(0, 3));

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
        <div>
          {/* Name on card */}
          <div className='mb-6'>
            <div className='mb-2.5 flex items-center justify-between'>
              <label htmlFor='cardName' className={LABEL_CLASS}>
                Name on card
              </label>
              {isNameValid && <CheckoutFieldCheck />}
            </div>
            <input
              id='cardName'
              type='text'
              name='cardName'
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder='As shown on card'
              autoComplete='cc-name'
              className={FIELD_CLASS}
            />
          </div>

          {/* Card number */}
          <div className='mb-6'>
            <div className='mb-2.5 flex items-center justify-between'>
              <label htmlFor='cardNumber' className={LABEL_CLASS}>
                Card number
              </label>
              {isCardNumberValid && <CheckoutFieldCheck />}
            </div>
            <div className='flex items-center gap-3 rounded-sm border border-line bg-cream px-4.5 py-3.5'>
              <svg
                viewBox='0 0 24 16'
                fill='none'
                stroke='currentColor'
                strokeWidth={1.5}
                aria-hidden='true'
                className='h-4 w-5.5 shrink-0 text-muted'
              >
                <rect x='0.5' y='0.5' width='23' height='15' rx='2' />
                <line x1='0.5' y1='5' x2='23.5' y2='5' />
              </svg>
              <input
                id='cardNumber'
                type='text'
                value={cardNumber}
                onChange={onCardNumber}
                placeholder='1234 1234 1234 1234'
                autoComplete='cc-number'
                inputMode='numeric'
                aria-label='Card number'
                maxLength={19}
                className='min-w-0 flex-1 bg-transparent font-mono text-[14px] text-ink outline-none placeholder:text-muted/60'
              />
            </div>
          </div>

          {/* Expiry + CVC side by side */}
          <div className='grid grid-cols-2 gap-4'>
            {/* Expiry */}
            <div>
              <div className='mb-2.5 flex items-center justify-between'>
                <label className={LABEL_CLASS}>Expiry</label>
                {isExpiryValid && <CheckoutFieldCheck />}
              </div>
              <div className='flex items-center gap-2 rounded-sm border border-line bg-cream px-4 py-3.5'>
                <input
                  type='text'
                  value={month}
                  onChange={onMonth}
                  placeholder='MM'
                  autoComplete='cc-exp-month'
                  inputMode='numeric'
                  aria-label='Expiry month'
                  maxLength={2}
                  className='w-8 bg-transparent text-center font-mono text-[14px] text-ink outline-none placeholder:text-muted/60'
                />
                <span
                  className='select-none font-mono text-[14px] text-muted'
                  aria-hidden='true'
                >
                  /
                </span>
                <input
                  ref={yearRef}
                  type='text'
                  value={year}
                  onChange={onYear}
                  placeholder='YY'
                  autoComplete='cc-exp-year'
                  inputMode='numeric'
                  aria-label='Expiry year'
                  maxLength={2}
                  className='w-8 bg-transparent text-center font-mono text-[14px] text-ink outline-none placeholder:text-muted/60'
                />
              </div>
            </div>

            {/* CVC */}
            <div>
              <div className='mb-2.5 flex items-center justify-between'>
                <label htmlFor='cvc' className={LABEL_CLASS}>
                  CVC
                </label>
                {isCvcValid && <CheckoutFieldCheck />}
              </div>
              <div className='flex items-center rounded-sm border border-line bg-cream px-4 py-3.5'>
                <input
                  id='cvc'
                  type='text'
                  value={cvc}
                  onChange={onCvc}
                  placeholder='123'
                  autoComplete='cc-csc'
                  inputMode='numeric'
                  aria-label='Card CVC'
                  maxLength={3}
                  className='w-full bg-transparent text-center font-mono text-[14px] text-ink outline-none placeholder:text-muted/60'
                />
              </div>
            </div>
          </div>

          {isLoggedIn && (
            <label className='mt-5 flex cursor-pointer items-start gap-2.5 border-t border-line pt-4 text-[13px] text-ink-soft'>
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
