'use client';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Props = {
  total: number;
  onNewPromo: () => void;
};

export default function PromosPageHeader({ total, onNewPromo }: Props) {
  return (
    <AdminPageHeader
      eyebrow="Manage"
      breadcrumb="Promos"
      title="Promo"
      titleAccent="codes"
      subtitle={`${total} code${total === 1 ? '' : 's'} in catalog`}
      actions={
        <button
          onClick={onNewPromo}
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New promo
        </button>
      }
    />
  );
}
