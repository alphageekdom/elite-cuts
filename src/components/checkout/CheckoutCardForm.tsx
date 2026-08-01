'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { useCheckoutContext } from '@/context/CheckoutContext';
import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import { brandFromBin } from '@/lib/payments/brand';
import { formatCardNumber } from '@/lib/payments/card-display';

type Props = {
  isLoggedIn: boolean;
  // Called when the form-fully-valid bit flips so the parent can compose it
  // with the rest of the payment-method readiness signal.
  onValidityChange: (valid: boolean) => void;
};

// Manual card-entry form on the checkout payment selector. Owns the four
// input fields (name / number / MM-YY / CVC), validates them locally,
// lifts the four display fields into the checkout context as a card-details
// snapshot once valid (used by the Card-tile demo path to write a
// SavedCard row after the order completes), and exposes its overall
// validity to the parent through onValidityChange so the parent can
// flip the global "ready to continue" flag.
//
// Raw card number never leaves this component — only the inferred brand
// from the BIN, the last4, and the cardholder name surface upstream.
export default function CheckoutCardForm({ isLoggedIn, onValidityChange }: Props) {
  const { state, dispatch } = useCheckoutContext();
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cvc, setCvc] = useState('');
  const yearRef = useRef<HTMLInputElement>(null);

  const isNameValid = cardName.trim().length >= 5;
  const isCardNumberValid = cardNumber.replace(/\s/g, '').length === 16;
  const isMonthValid =
    month.length === 2 && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12;
  const isYearValid =
    year.length === 2 && parseInt(year, 10) >= new Date().getFullYear() % 100;
  // Year alone let an already-expired month through inside the current year —
  // "01/26" passed in July 2026. Only the current year needs the extra check;
  // any later year is fine whatever the month.
  const isExpiryValid =
    isMonthValid &&
    isYearValid &&
    (parseInt(year, 10) > new Date().getFullYear() % 100 ||
      parseInt(month, 10) >= new Date().getMonth() + 1);
  const isCvcValid = cvc.length === 3;
  const isFullyValid = isNameValid && isCardNumberValid && isExpiryValid && isCvcValid;

  useEffect(() => {
    onValidityChange(isFullyValid);
  }, [isFullyValid, onValidityChange]);

  // Lift the four display fields (brand from BIN, last4, month, year) into
  // checkout context whenever the form is fully valid. The session route
  // reads these to write a SavedCard row after the demo order completes, so
  // a Visa ending 4242 typed at checkout shows up as "Visa ending 4242" in
  // the profile — not random stub data. Cleared when the form goes invalid.
  useEffect(() => {
    if (isNameValid && isCardNumberValid && isExpiryValid) {
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
  }, [cardName, cardNumber, month, year, isNameValid, isCardNumberValid, isExpiryValid, dispatch]);

  // On unmount — when the shopper switches to the Stripe tile or picks a
  // saved card — clear the card-details snapshot AND signal invalidity to
  // the parent so neither context nor lifted state can carry stale fields
  // from a tile the shopper is no longer using. Matches the pre-refactor
  // behavior where a single in-component effect cleared this whenever
  // `method !== 'card'`.
  useEffect(() => {
    return () => {
      dispatch({ type: 'SET_CARD_DETAILS', payload: null });
      onValidityChange(false);
    };
  }, [dispatch, onValidityChange]);

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
            className='min-w-0 flex-1 bg-transparent font-mono text-[14px] text-ink outline-none placeholder:text-muted'
          />
        </div>
      </div>

      {/* Expiry + CVC side by side */}
      <div className='grid grid-cols-2 gap-4'>
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
              className='w-8 bg-transparent text-center font-mono text-[14px] text-ink outline-none placeholder:text-muted'
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
              className='w-8 bg-transparent text-center font-mono text-[14px] text-ink outline-none placeholder:text-muted'
            />
          </div>
        </div>

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
              className='w-full bg-transparent text-center font-mono text-[14px] text-ink outline-none placeholder:text-muted'
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
  );
}
