import Link from 'next/link';

type Props = {
  total: number;
  inStock: number;
  outOfStock: number;
};

export default function ProductsPageHeader({ total, inStock, outOfStock }: Props) {
  return (
    <div className="flex items-start justify-between mb-9 gap-6 flex-wrap">
      {/* Breadcrumb */}
      <div className="w-full flex items-center gap-2 text-[12px] text-muted tracking-[0.04em] mb-1">
        <Link href="/dashboard" className="hover:text-oxblood transition-colors">
          Dashboard
        </Link>
        <svg className="w-2.5 h-2.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-ink">Products</span>
      </div>

      <div>
        <div className="font-display italic text-sm text-camel mb-1.5">Catalog</div>
        <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-tight mb-1">
          All <em className="italic text-oxblood">cuts</em>
        </h1>
        <p className="text-muted text-sm tracking-[0.02em]">
          {total} cuts in catalog · {inStock} in stock · {outOfStock} out of stock
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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
      </div>
    </div>
  );
}
