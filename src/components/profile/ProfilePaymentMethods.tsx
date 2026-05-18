'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SavedCardSummary = {
  id: string;
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

const formatExpiry = (month: number, year: number): string => {
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
};

export default function ProfilePaymentMethods() {
  const [cards, setCards] = useState<SavedCardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  if (cards.length === 0) {
    return (
      <div className='bg-paper border border-line-soft rounded p-8 text-center'>
        <p className='font-display text-[18px] font-medium tracking-tight'>
          No saved cards yet
        </p>
        <p className='mt-2 text-[13px] leading-relaxed text-ink-soft'>
          Tick &ldquo;Save this card&rdquo; on your next Stripe checkout and it
          will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className='flex flex-col gap-3'>
      {cards.map((card) => {
        const isConfirming = confirmingId === card.id;
        const isDeleting = deletingId === card.id;
        return (
          <li
            key={card.id}
            className='bg-paper border border-line-soft rounded px-5 py-5 flex items-start justify-between gap-4'
          >
            <div>
              <p className='font-display text-[17px] font-medium tracking-tight'>
                {formatBrand(card.brand)}{' '}
                <span className='font-sans text-muted'>ending</span>{' '}
                <span className='font-mono'>{card.last4}</span>
              </p>
              <p className='mt-1 text-[13px] text-ink-soft'>
                Exp <span className='font-mono'>{formatExpiry(card.expMonth, card.expYear)}</span>
              </p>
            </div>

            <div className='flex items-center gap-3 shrink-0'>
              {!isConfirming ? (
                <button
                  type='button'
                  onClick={() => setConfirmingId(card.id)}
                  aria-label={`Remove ${formatBrand(card.brand)} ending ${card.last4}`}
                  className='text-[12px] tracking-[0.08em] uppercase text-muted hover:text-oxblood transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm'
                >
                  Remove
                </button>
              ) : (
                <span className='flex items-center gap-2'>
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
