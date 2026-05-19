'use client';
import { useState, type FormEvent } from 'react';

import { brandFromBin } from '@/lib/payments/brand';
import { formatCardNumber } from '@/lib/payments/card-display';

type Props = {
  saving: boolean;
  onSave: (details: {
    cardholderName: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }) => void;
};

// Inline Add-card form shown above the saved-cards list on the profile
// Payment methods tab. The raw card number never leaves this component —
// only the inferred brand, the last4, and the typed cardholder name are
// lifted to the server.
export default function ProfileAddCardForm({ saving, onSave }: Props) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const digits = number.replace(/\s/g, '');
  const nameValid = name.trim().length >= 2;
  const numberValid = digits.length === 16;
  const monthNum = parseInt(month, 10);
  const yearNum = 2000 + parseInt(year, 10);
  const thisYear = new Date().getFullYear();
  const monthValid = monthNum >= 1 && monthNum <= 12;
  const yearValid = yearNum >= thisYear && yearNum <= thisYear + 20;
  const valid = nameValid && numberValid && monthValid && yearValid;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    onSave({
      cardholderName: name.trim(),
      brand: brandFromBin(digits),
      last4: digits.slice(-4),
      expMonth: monthNum,
      expYear: yearNum,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='mb-3 bg-paper border border-line-soft rounded px-5 py-5'
    >
      <p className='font-display text-[17px] font-medium tracking-tight mb-4'>
        Add a card
      </p>

      <label className='block mb-3'>
        <span className='block mb-1.5 text-[12px] uppercase tracking-[0.08em] text-muted'>
          Name on card
        </span>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='As shown on card'
          autoComplete='cc-name'
          maxLength={120}
          className='w-full rounded-sm border border-line bg-cream px-3 py-2.5 text-[14px] outline-none focus:border-ink'
        />
      </label>

      <label className='block mb-3'>
        <span className='block mb-1.5 text-[12px] uppercase tracking-[0.08em] text-muted'>
          Card number
        </span>
        <input
          type='text'
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          placeholder='1234 1234 1234 1234'
          autoComplete='cc-number'
          inputMode='numeric'
          maxLength={19}
          className='w-full rounded-sm border border-line bg-cream px-3 py-2.5 font-mono text-[14px] outline-none focus:border-ink'
        />
      </label>

      <div className='flex items-end gap-3'>
        <label className='flex-1 max-w-32'>
          <span className='block mb-1.5 text-[12px] uppercase tracking-[0.08em] text-muted'>
            Expiry
          </span>
          <div className='flex items-center gap-2 rounded-sm border border-line bg-cream px-3 py-2.5'>
            <input
              type='text'
              value={month}
              onChange={(e) =>
                setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))
              }
              placeholder='MM'
              inputMode='numeric'
              aria-label='Expiry month'
              maxLength={2}
              className='w-8 bg-transparent text-center font-mono text-[14px] outline-none'
            />
            <span className='font-mono text-muted' aria-hidden='true'>/</span>
            <input
              type='text'
              value={year}
              onChange={(e) =>
                setYear(e.target.value.replace(/\D/g, '').slice(0, 2))
              }
              placeholder='YY'
              inputMode='numeric'
              aria-label='Expiry year'
              maxLength={2}
              className='w-8 bg-transparent text-center font-mono text-[14px] outline-none'
            />
          </div>
        </label>

        <button
          type='submit'
          disabled={!valid || saving}
          className='text-[12px] tracking-[0.08em] uppercase text-ink hover:text-oxblood transition-colors min-h-8 border-b border-current pb-px disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
        >
          {saving ? '…' : 'Save card'}
        </button>
      </div>

      <p className='mt-3 text-[11px] text-muted'>
        Only the last four digits of the card number are stored. Use the
        Cancel button up top to close this form.
      </p>
    </form>
  );
}
