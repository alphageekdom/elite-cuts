'use client';

import { useEffect, useState } from 'react';

type PublicPromo = { code: string; label: string };

type Props = {
  // Called when the customer taps a chip. The parent runs the same validate +
  // apply path as a manual type-and-submit so the chip is genuinely one-tap.
  // Returns a Promise so this component can dim the chip while the round
  // trip is in flight.
  onApply: (code: string) => Promise<void> | void;
};

export default function CheckoutPublicPromos({ onApply }: Props) {
  const [items, setItems] = useState<PublicPromo[] | null>(null);
  // Which chip the customer just tapped — the parent's apply path is async,
  // so the chip dims and disables while the round-trip resolves. null when
  // nothing is in flight.
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

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

  const handleClick = async (code: string) => {
    // Sibling chips stay tappable during one chip's round-trip so the
    // strip doesn't feel frozen on a slow connection. This guard is what
    // actually serializes the applies — without it a rapid second tap on
    // a different chip would fire in parallel and the last-to-resolve
    // promo would silently win.
    if (applyingCode) return;
    setApplyingCode(code);
    try {
      await onApply(code);
    } finally {
      setApplyingCode(null);
    }
  };

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {items.map((p) => {
        const isApplying = applyingCode === p.code;
        return (
          <button
            key={p.code}
            type="button"
            onClick={() => void handleClick(p.code)}
            disabled={isApplying}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft transition-all duration-200 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line disabled:hover:text-ink-soft"
          >
            <span className="text-camel">+</span>
            <span className="font-medium text-ink">{p.code}</span>
            <span className="text-muted">·</span>
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
