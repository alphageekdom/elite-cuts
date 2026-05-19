'use client';
import { useEffect, useState } from 'react';

import type { SavedCardSummary } from '@/lib/payments/card-display';

// Single source of truth for the customer's saved cards. Used by the
// checkout payment selector (read-only — picks a card to pay with) and by
// the profile Payment methods tab (read + add + remove + update expiry).
//
// `enabled` defaults to true; the checkout selector passes false when the
// demo Card tile is gated off (Stripe's hosted page handles saved-card pay
// in that mode, so the strip should stay empty).

type AddCardDetails = {
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type MutationResult = { ok: true } | { ok: false; message: string };

export type UseSavedCards = {
  cards: SavedCardSummary[];
  loaded: boolean;
  error: string | null;
  add: (details: AddCardDetails) => Promise<MutationResult>;
  remove: (id: string) => Promise<MutationResult>;
  updateExpiry: (id: string, expMonth: number, expYear: number) => Promise<MutationResult>;
};

export function useSavedCards({ enabled = true }: { enabled?: boolean } = {}): UseSavedCards {
  const [cards, setCards] = useState<SavedCardSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Mark as loaded so callers that wait on `loaded` don't hang.
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/payment-methods');
        if (!res.ok) throw new Error('load failed');
        const data = (await res.json()) as { cards: SavedCardSummary[] };
        if (cancelled) return;
        setCards(data.cards);
      } catch (err) {
        console.error('[useSavedCards] load failed', err);
        if (cancelled) return;
        setError('Could not load saved cards.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  async function refresh(): Promise<void> {
    try {
      const res = await fetch('/api/me/payment-methods');
      if (!res.ok) return;
      const data = (await res.json()) as { cards: SavedCardSummary[] };
      setCards(data.cards);
    } catch (err) {
      console.error('[useSavedCards] refresh failed', err);
    }
  }

  async function add(details: AddCardDetails): Promise<MutationResult> {
    try {
      const res = await fetch('/api/me/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        return { ok: false, message: data.message ?? 'Could not add card' };
      }
      // Refetch so the newly-added card surfaces with whatever id the server
      // minted — easier than constructing a synthetic row from the response.
      await refresh();
      return { ok: true };
    } catch (err) {
      console.error('[useSavedCards] add failed', err);
      return { ok: false, message: 'Could not add card' };
    }
  }

  async function remove(id: string): Promise<MutationResult> {
    try {
      const res = await fetch(`/api/me/payment-methods/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        return { ok: false, message: data.message ?? 'Could not remove card' };
      }
      setCards((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    } catch (err) {
      console.error('[useSavedCards] remove failed', err);
      return { ok: false, message: 'Could not remove card' };
    }
  }

  async function updateExpiry(
    id: string,
    expMonth: number,
    expYear: number,
  ): Promise<MutationResult> {
    try {
      const res = await fetch(`/api/me/payment-methods/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expMonth, expYear }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        return { ok: false, message: data.message ?? 'Could not update card' };
      }
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, expMonth, expYear } : c)),
      );
      return { ok: true };
    } catch (err) {
      console.error('[useSavedCards] update failed', err);
      return { ok: false, message: 'Could not update card' };
    }
  }

  return { cards, loaded, error, add, remove, updateExpiry };
}
