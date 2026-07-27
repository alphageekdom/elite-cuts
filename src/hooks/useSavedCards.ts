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
  // Set only by the initial load (and by a failed retry); mutations report
  // failure through their own MutationResult. Cleared by a successful load
  // and nothing else — deliberately not by a successful mutation, which
  // proves the server is reachable but says nothing about `cards` being
  // complete. A failed load leaves `cards` empty, so clearing on an add
  // would swap an honest error for a list claiming the customer has exactly
  // one card. Consumers must render this *instead of* the list and offer
  // `retry`, which is the only thing that makes the list trustworthy again.
  loadError: string | null;
  retry: () => void;
  add: (details: AddCardDetails) => Promise<MutationResult>;
  remove: (id: string) => Promise<MutationResult>;
  updateExpiry: (id: string, expMonth: number, expYear: number) => Promise<MutationResult>;
};

export function useSavedCards({ enabled = true }: { enabled?: boolean } = {}): UseSavedCards {
  const [cards, setCards] = useState<SavedCardSummary[]>([]);
  const [fetched, setFetched] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped by `retry` to re-run the load effect. A counter rather than an
  // imperative loader so the retry keeps the effect's cancellation guard.
  const [attempt, setAttempt] = useState(0);
  // Disabled callers don't wait on the fetch — derive loaded from enabled so
  // we never need a synchronous setState in the effect body to short-circuit.
  const loaded = !enabled || fetched;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/payment-methods');
        if (!res.ok) throw new Error('load failed');
        const data = (await res.json()) as { items: SavedCardSummary[] };
        if (cancelled) return;
        setCards(data.items);
        setLoadError(null);
      } catch (err) {
        console.error('[useSavedCards] load failed', err);
        if (cancelled) return;
        setLoadError('Could not load saved cards.');
      } finally {
        if (!cancelled) setFetched(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  // Clears the error and drops back to the loading state so a failed load
  // isn't terminal. Consumers render the error instead of the list, so
  // without this the only way out is a full page reload.
  function retry() {
    setLoadError(null);
    setFetched(false);
    setAttempt((n) => n + 1);
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
      // The POST echoes the created row, so insert it rather than refetching.
      // The list is newest-first, so the new card goes on the front.
      //
      // A 2xx means the card is saved, so the result stays `ok` even if the
      // body can't be read — reporting failure there would push the customer
      // to add it again and hit the duplicate conflict. Worst case the row is
      // missing until the next load, which is what refetching used to risk.
      const body = (await res.json().catch(() => null)) as {
        data?: SavedCardSummary;
      } | null;
      const card = body?.data;
      if (card) setCards((prev) => [card, ...prev]);
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

  return { cards, loaded, loadError, retry, add, remove, updateExpiry };
}
