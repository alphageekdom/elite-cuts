'use client';
import { useState, type FormEvent } from 'react';

type Props = {
  initialMonth: number;
  initialYear: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (expMonth: number, expYear: number) => void;
};

// Inline expiry editor that swaps in for the static "Exp MM/YY" line on a
// saved-card row. Validates locally before submit so a typo can't fire a
// 400 round-trip.
export default function ProfileExpiryEditForm({
  initialMonth,
  initialYear,
  saving,
  onCancel,
  onSave,
}: Props) {
  const [month, setMonth] = useState(String(initialMonth).padStart(2, '0'));
  const [year, setYear] = useState(String(initialYear).slice(-2));

  const monthNum = parseInt(month, 10);
  const yearNum = 2000 + parseInt(year, 10);
  const thisYear = new Date().getFullYear();
  const monthValid = monthNum >= 1 && monthNum <= 12;
  const yearValid = yearNum >= thisYear && yearNum <= thisYear + 20;
  const valid = monthValid && yearValid;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    onSave(monthNum, yearNum);
  }

  return (
    <form onSubmit={handleSubmit} className='mt-3 flex items-center gap-2'>
      <label className='sr-only' htmlFor='exp-month'>Expiry month</label>
      <input
        id='exp-month'
        type='text'
        inputMode='numeric'
        value={month}
        onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
        placeholder='MM'
        maxLength={2}
        aria-label='Expiry month'
        className='w-12 rounded-sm border border-line bg-cream px-2 py-1.5 text-center font-mono text-[13px] outline-none focus:border-ink'
      />
      <span className='font-mono text-[13px] text-muted' aria-hidden='true'>/</span>
      <label className='sr-only' htmlFor='exp-year'>Expiry year</label>
      <input
        id='exp-year'
        type='text'
        inputMode='numeric'
        value={year}
        onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
        placeholder='YY'
        maxLength={2}
        aria-label='Expiry year'
        className='w-12 rounded-sm border border-line bg-cream px-2 py-1.5 text-center font-mono text-[13px] outline-none focus:border-ink'
      />
      <button
        type='submit'
        disabled={!valid || saving}
        className='ml-1 text-[12px] font-medium text-ink hover:text-oxblood disabled:opacity-40 min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        type='button'
        onClick={onCancel}
        aria-label='Cancel edit'
        className='text-[12px] text-muted hover:text-ink min-h-8 min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
      >
        ✕
      </button>
    </form>
  );
}
