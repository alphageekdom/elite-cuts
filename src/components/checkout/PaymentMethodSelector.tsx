'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { useCheckoutContext } from '@/context/CheckoutContext';
import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';

type PayMethod = 'card' | 'paypal' | 'apple';

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
  { id: 'paypal', label: 'PayPal' },
  { id: 'apple', label: 'Apple Pay' },
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
  if (id === 'paypal') {
    return (
      <svg
        viewBox='0 0 24 24'
        fill='currentColor'
        aria-hidden='true'
        className='h-4.5 w-4.5'
      >
        <path d='M7.4 7.5h3.6c2.4 0 3.4 1.4 3.1 3.7-.4 2.7-2 3.7-4.4 3.7H8.5l-.6 3.7H5.6L7.4 7.5zm1.7 5.4h.7c1.1 0 1.9-.5 2-1.7.1-.9-.4-1.4-1.4-1.4h-.8l-.5 3.1zM15.4 7.5H19c2.4 0 3.4 1.4 3.1 3.7-.4 2.7-2 3.7-4.4 3.7h-1.2l-.6 3.7h-2.3l1.8-11.1zm1.7 5.4h.7c1.1 0 1.9-.5 2-1.7.1-.9-.4-1.4-1.4-1.4h-.8l-.5 3.1z' />
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
      <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
    </svg>
  );
};

const formatCardNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const PaymentMethodSelector = () => {
  const [method, setMethod] = useState<PayMethod>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cvc, setCvc] = useState('');

  const yearRef = useRef<HTMLInputElement>(null);

  const { setIsPaymentReady } = useCheckoutContext();

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
    setIsPaymentReady(
      method === 'card' &&
        isNameValid &&
        isCardNumberValid &&
        isExpiryValid &&
        isCvcValid,
    );
  }, [method, isNameValid, isCardNumberValid, isExpiryValid, isCvcValid, setIsPaymentReady]);

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
    const clamped = digits.length === 2 && num < 26 ? '26' : digits;
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
          Encrypted via Stripe
        </span>
      </div>

      <div className='mb-6 grid grid-cols-3 gap-2'>
        {PAY_METHODS.map(({ id, label }) => (
          <button
            key={id}
            type='button'
            onClick={() => setMethod(id)}
            aria-pressed={method === id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-sm border px-2 py-3 text-[12px] font-medium transition-[background-color,border-color,color] duration-300 sm:gap-2 sm:px-4 sm:py-3.5 sm:text-[13px] motion-reduce:transition-none ${
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

          <label className='mt-5 flex cursor-pointer items-start gap-3'>
            <input
              type='checkbox'
              name='saveCard'
              className='mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-oxblood'
            />
            <span className='text-[13px] leading-relaxed text-ink-soft'>
              Save this card for faster checkout next time.
            </span>
          </label>
        </div>
      )}

      {method !== 'card' && (
        <div className='rounded-sm border border-line bg-cream px-5 py-7 text-center'>
          <p className='text-[13px] text-muted'>
            {method === 'paypal' ? 'PayPal' : 'Apple Pay'} integration coming
            soon.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
