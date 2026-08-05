'use client';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PlusIcon from '@/components/ui/icons/PlusIcon';

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
          <PlusIcon className="w-3.5 h-3.5" strokeWidth={2} />
          New promo
        </button>
      }
    />
  );
}
