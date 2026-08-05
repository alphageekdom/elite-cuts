'use client';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PlusIcon from '@/components/ui/icons/PlusIcon';

type Props = {
  monthOrdersCount: number;
  pendingCount: number;
  exporting: boolean;
  onExport: () => void;
  onNewOrder: () => void;
};

export default function OrdersPageHeader({
  monthOrdersCount,
  pendingCount,
  exporting,
  onExport,
  onNewOrder,
}: Props) {
  return (
    <AdminPageHeader
      eyebrow="Manage"
      breadcrumb="Orders"
      title="All"
      titleAccent="orders"
      subtitle={`${monthOrdersCount} order${monthOrdersCount === 1 ? '' : 's'} this month · ${pendingCount} pending action`}
      actions={
        <>
          <button
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={onNewOrder}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" strokeWidth={2} />
            New order
          </button>
        </>
      }
    />
  );
}
