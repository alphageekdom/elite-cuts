'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { brandFromBin } from '@/lib/payments/brand';

type SavedCardSummary = {
  id: string;
  cardholderName?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

const formatBrand = (brand: string): string => {
  const lower = brand.toLowerCase();
  if (lower === 'amex' || lower === 'american express') return 'Amex';
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
};


// Masked card display in the conventional "•••• •••• •••• ####" format used
// by Stripe, Apple Pay, and most wallet UIs. The first twelve digits never
// leave the form — there's nothing to show.
const maskedNumber = (last4: string): string => `•••• •••• •••• ${last4}`;

const formatExpiry = (month: number, year: number): string => {
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
};

// True when the card's expiry month/year has already passed. Treated as
// "first day of the month after expiry" — a Dec 2025 card is valid through
// Dec 31 2025, expired starting Jan 1 2026.
const isExpired = (month: number, year: number): boolean => {
  const now = new Date();
  const nowMonths = now.getFullYear() * 12 + now.getMonth();
  const cardMonths = year * 12 + (month - 1);
  return cardMonths < nowMonths;
};

export default function ProfilePaymentMethods() {
  const [cards, setCards] = useState<SavedCardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/payment-methods');
        if (!res.ok) throw new Error('load failed');
        const data = (await res.json()) as { cards: SavedCardSummary[] };
        if (!cancelled) setCards(data.cards);
      } catch (err) {
        console.error('[ProfilePaymentMethods] load failed', err);
        if (!cancelled) setError('Could not load saved cards.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/me/payment-methods/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(data.message ?? 'Could not remove card');
        return;
      }
      setCards((prev) => prev?.filter((c) => c.id !== id) ?? null);
      setConfirmingId(null);
      toast.success('Card removed');
    } catch (err) {
      console.error('[ProfilePaymentMethods] delete failed', err);
      toast.error('Could not remove card');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddCard(details: {
    cardholderName: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }) {
    setCreating(true);
    try {
      const res = await fetch('/api/me/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(data.message ?? 'Could not add card');
        return;
      }
      // Refetch so the newly-added card surfaces with whatever id the server
      // minted — easier than constructing a synthetic row from the response.
      const listRes = await fetch('/api/me/payment-methods');
      if (listRes.ok) {
        const listData = (await listRes.json()) as { cards: SavedCardSummary[] };
        setCards(listData.cards);
      }
      setAdding(false);
      toast.success('Card added');
    } catch (err) {
      console.error('[ProfilePaymentMethods] add failed', err);
      toast.error('Could not add card');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateExpiry(
    id: string,
    expMonth: number,
    expYear: number,
  ) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/me/payment-methods/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expMonth, expYear }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(data.message ?? 'Could not update card');
        return;
      }
      setCards((prev) =>
        prev?.map((c) => (c.id === id ? { ...c, expMonth, expYear } : c)) ?? null,
      );
      setEditingId(null);
      toast.success('Expiry updated');
    } catch (err) {
      console.error('[ProfilePaymentMethods] update failed', err);
      toast.error('Could not update card');
    } finally {
      setSavingId(null);
    }
  }

  if (error) {
    return (
      <div className='bg-paper border border-line-soft rounded p-6 text-[14px] text-ink-soft'>
        {error}
      </div>
    );
  }

  if (cards === null) {
    return (
      <div className='bg-paper border border-line-soft rounded p-6 text-[14px] text-muted'>
        Loading…
      </div>
    );
  }

  // Button label toggles in place so the header layout never reflows when
  // the form opens. Same button position, same row, just different text.
  const headerBar = (
    <div className='mb-4 flex items-center justify-between gap-3'>
      <span className='text-[13px] text-muted'>
        {cards.length === 0
          ? 'No cards on file'
          : `${cards.length} card${cards.length === 1 ? '' : 's'} on file`}
      </span>
      <button
        type='button'
        onClick={() => setAdding((open) => !open)}
        aria-expanded={adding}
        className='text-[12px] tracking-[0.08em] uppercase text-ink hover:text-oxblood transition-colors border-b border-current pb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
      >
        {adding ? 'Cancel' : '+ Add card'}
      </button>
    </div>
  );

  const addForm = adding && (
    <AddCardForm saving={creating} onSave={handleAddCard} />
  );

  if (cards.length === 0) {
    return (
      <div>
        {headerBar}
        {addForm}
        {!adding && (
          <div className='bg-paper border border-line-soft rounded p-8 text-center'>
            <p className='font-display text-[18px] font-medium tracking-tight'>
              No saved cards yet
            </p>
            <p className='mt-2 text-[13px] leading-relaxed text-ink-soft'>
              Add a card here, or tick &ldquo;Save this card&rdquo; on your next
              checkout.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {headerBar}
      {addForm}
      <ul className='flex flex-col gap-3'>
      {cards.map((card) => {
        const isConfirming = confirmingId === card.id;
        const isDeleting = deletingId === card.id;
        const isEditing = editingId === card.id;
        const isSaving = savingId === card.id;
        const expired = isExpired(card.expMonth, card.expYear);

        return (
          <li
            key={card.id}
            className={`bg-paper border rounded px-5 py-5 flex items-start justify-between gap-4 ${
              expired ? 'border-oxblood/40' : 'border-line-soft'
            }`}
          >
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-display text-[17px] font-medium tracking-tight'>
                  {formatBrand(card.brand)}
                </span>
                {expired && (
                  <span className='bg-oxblood text-cream text-[10px] font-medium tracking-widest uppercase px-2 py-0.5 rounded-full'>
                    Expired
                  </span>
                )}
              </div>
              <p className='mt-1.5 font-mono text-[14px] text-ink-soft tracking-wider'>
                {maskedNumber(card.last4)}
              </p>
              {card.cardholderName && (
                <p className='mt-1 text-[12px] uppercase tracking-[0.08em] text-muted'>
                  {card.cardholderName}
                </p>
              )}
              {!isEditing ? (
                <p className='mt-1 text-[13px] text-ink-soft'>
                  Exp{' '}
                  <span className='font-mono'>
                    {formatExpiry(card.expMonth, card.expYear)}
                  </span>
                </p>
              ) : (
                <ExpiryEditForm
                  initialMonth={card.expMonth}
                  initialYear={card.expYear}
                  saving={isSaving}
                  onCancel={() => setEditingId(null)}
                  onSave={(m, y) => handleUpdateExpiry(card.id, m, y)}
                />
              )}
            </div>

            {!isEditing && !isConfirming && (
              <div className='flex items-center gap-3 shrink-0'>
                <button
                  type='button'
                  onClick={() => setEditingId(card.id)}
                  aria-label={`Edit expiry on ${formatBrand(card.brand)} ending ${card.last4}`}
                  className='text-[12px] tracking-[0.08em] uppercase text-muted hover:text-ink transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
                >
                  Edit
                </button>
                <button
                  type='button'
                  onClick={() => setConfirmingId(card.id)}
                  aria-label={`Remove ${formatBrand(card.brand)} ending ${card.last4}`}
                  className='text-[12px] tracking-[0.08em] uppercase text-muted hover:text-oxblood transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm'
                >
                  Remove
                </button>
              </div>
            )}

            {isConfirming && (
              <span className='flex items-center gap-2 shrink-0'>
                <button
                  type='button'
                  onClick={() => handleDelete(card.id)}
                  disabled={isDeleting}
                  className='text-[12px] font-medium text-oxblood hover:underline disabled:opacity-50 min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm'
                >
                  {isDeleting ? '…' : 'Confirm'}
                </button>
                <button
                  type='button'
                  onClick={() => setConfirmingId(null)}
                  aria-label='Cancel removal'
                  className='text-[12px] text-muted hover:text-ink min-h-8 min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
                >
                  ✕
                </button>
              </span>
            )}
          </li>
        );
      })}
      </ul>
    </div>
  );
}

type ExpiryEditFormProps = {
  initialMonth: number;
  initialYear: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (expMonth: number, expYear: number) => void;
};

function ExpiryEditForm({ initialMonth, initialYear, saving, onCancel, onSave }: ExpiryEditFormProps) {
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

type AddCardFormProps = {
  saving: boolean;
  onSave: (details: {
    cardholderName: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }) => void;
};

function AddCardForm({ saving, onSave }: AddCardFormProps) {
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

  function onNumberChange(raw: string) {
    const onlyDigits = raw.replace(/\D/g, '').slice(0, 16);
    setNumber(onlyDigits.replace(/(\d{4})(?=\d)/g, '$1 '));
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
          onChange={(e) => onNumberChange(e.target.value)}
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
