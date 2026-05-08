import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Props = {
  total: number;
  inStock: number;
  outOfStock: number;
};

export default function ProductsPageHeader({ total, inStock, outOfStock }: Props) {
  return (
    <AdminPageHeader
      eyebrow="Catalog"
      breadcrumb="Products"
      title="All"
      titleAccent="cuts"
      subtitle={`${total} cuts in catalog · ${inStock} in stock · ${outOfStock} out of stock`}
      actions={
        <>
          <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import CSV
          </button>
        </>
      }
    />
  );
}
