import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Props = {
  total: number;
  newThisWeek: number;
};

export default function CustomersPageHeader({ total, newThisWeek }: Props) {
  return (
    <AdminPageHeader
      eyebrow="Manage"
      breadcrumb="Customers"
      title="All"
      titleAccent="customers"
      subtitle={`${total} customers · ${newThisWeek} new this week`}
      actions={
        <>
          <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Send campaign
          </button>
          <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add customer
          </button>
        </>
      }
    />
  );
}
