'use client';

import { useEffect, useState } from 'react';

type PublicPromo = { code: string; label: string };

type Props = {
  // Called when the customer taps a chip. The parent runs the same validate +
  // apply path as a manual type-and-submit so the chip is genuinely one-tap.
  onApply: (code: string) => void;
};

export default function CheckoutPublicPromos({ onApply }: Props) {
  const [items, setItems] = useState<PublicPromo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/promos/public')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: { items: PublicPromo[] }) => {
        if (cancelled) return;
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {items.map((p) => (
        <button
          key={p.code}
          type="button"
          onClick={() => onApply(p.code)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft transition-colors duration-200 hover:border-ink hover:text-ink"
        >
          <span className="text-camel">+</span>
          <span className="font-medium text-ink">{p.code}</span>
          <span className="text-muted">·</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}
