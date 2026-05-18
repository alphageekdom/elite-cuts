'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { useCheckoutContext, type PayMethod } from '@/context/CheckoutContext';
import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';

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

const PAY_METHODS: { id: PayMethod; label: string }[] = [
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

const formatCardNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const PaymentMethodSelector = () => {
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cvc, setCvc] = useState('');

  const yearRef = useRef<HTMLInputElement>(null);

  const { state, dispatch } = useCheckoutContext();
  const method = state.paymentMethod;
  const setMethod = (m: PayMethod) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: m });

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
        isNameValid &&
        isCardNumberValid &&
        isExpiryValid &&
        isCvcValid);
    dispatch({ type: 'SET_PAYMENT_READY', payload: ready });
  }, [method, isNameValid, isCardNumberValid, isExpiryValid, isCvcValid, dispatch]);

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

      <div className='mb-6 grid grid-cols-2 gap-2'>
        {PAY_METHODS.map(({ id, label }) => (
          <button
            key={id}
            type='button'
            onClick={() => setMethod(id)}
            aria-pressed={method === id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-sm border px-2 py-3 text-[12px] font-medium transition-[background-color,border-color,color] duration-300 sm:gap-2 sm:px-3 sm:py-3.5 sm:text-[13px] motion-reduce:transition-none ${
              method === id
                ? 'border-ink bg-ink text-cream'
                : 'border-line bg-cream text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            <PayMethodIcon id={id} />
            {label}
          </button>
        ))}
      </div>

      {method === 'card' && (
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
        </div>
      )}

    </div>
  );
};

export default PaymentMethodSelector;
