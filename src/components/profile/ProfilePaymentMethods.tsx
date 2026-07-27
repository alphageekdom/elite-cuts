'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  formatBrand,
  formatExpiry,
  isCardExpired,
  maskedNumber,
} from '@/lib/payments/card-display';
import { useSavedCards } from '@/hooks/useSavedCards';
import ProfileAddCardForm from './ProfileAddCardForm';
import ProfileExpiryEditForm from './ProfileExpiryEditForm';

export default function ProfilePaymentMethods() {
  const { data: session } = useSession();
  const isDemo = Boolean(session?.user?.isDemo);
  const { cards, loaded, loadError, retry, add, remove, updateExpiry } = useSavedCards();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await remove(id);
    setDeletingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setConfirmingId(null);
    toast.success('Card removed');
  }

  async function handleAddCard(details: {
    cardholderName: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }) {
    setCreating(true);
    const result = await add(details);
    setCreating(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setAdding(false);
    toast.success('Card added');
  }

  async function handleUpdateExpiry(
    id: string,
    expMonth: number,
    expYear: number,
  ) {
    setSavingId(id);
    const result = await updateExpiry(id, expMonth, expYear);
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setEditingId(null);
    toast.success('Expiry updated');
  }

  // Renders instead of the list, never alongside it — a failed load leaves
  // `cards` empty, and an empty list here would read as "no cards on file".
  if (loadError) {
    return (
      <div className='bg-paper border border-line-soft rounded p-6'>
        <p className='text-[14px] text-ink-soft'>{loadError}</p>
        <button
          type='button'
          onClick={retry}
          className='mt-3 text-[12px] tracking-[0.08em] uppercase text-ink hover:text-oxblood transition-colors border-b border-current pb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm'
        >
          Try again
        </button>
      </div>
    );
  }

  if (!loaded) {
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
    <ProfileAddCardForm saving={creating} onSave={handleAddCard} />
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
        const expired = isCardExpired(card.expMonth, card.expYear);

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
                <ProfileExpiryEditForm
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
                  disabled={isDemo}
                  title={isDemo ? 'Disabled in demo mode' : undefined}
                  aria-disabled={isDemo}
                  aria-label={`Remove ${formatBrand(card.brand)} ending ${card.last4}`}
                  className='text-[12px] tracking-[0.08em] uppercase text-muted hover:text-oxblood transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted'
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

