'use client';

import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Props = {
  totalProducts: number;
  lastStocktakeLabel: string;
  exporting?: boolean;
  onExport: () => void;
  onRecountAll: () => void;
  onLogDelivery: () => void;
};

export default function InventoryPageHeader({
  totalProducts,
  lastStocktakeLabel,
  exporting,
  onExport,
  onRecountAll,
  onLogDelivery,
}: Props) {
  return (
    <AdminPageHeader
      eyebrow="Operations"
      breadcrumb="Inventory"
      title="Stock &"
      titleAccent="aging"
      subtitle={`${totalProducts} cuts tracked · ${lastStocktakeLabel}`}
      actions={
        <>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button
            type="button"
            onClick={onRecountAll}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Recount all
          </button>
          <button
            type="button"
            onClick={onLogDelivery}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log delivery
          </button>
        </>
      }
    />
  );
}
