'use client';

// Top-of-table bulk action strip that appears once one or more product rows
// are checked. Renders the Publish / Unpublish / Edit-price / Delete chain
// against the state machine returned by useProductsTable so the parent
// component just hands the bag through.

type Bulk = {
  loading: string;
  patch: (body: Record<string, unknown>, label: string) => Promise<void>;
  remove: () => Promise<void>;
};

type Props = {
  count: number;
  bulk: Bulk;
};

export default function ProductsBulkBar({ count, bulk }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-ink text-cream">
      <div className="flex items-center gap-3 text-[13px]">
        <span className="bg-camel text-ink text-[12px] font-medium px-2 py-0.5 rounded-full">
          {count}
        </span>
        selected
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => bulk.patch({ isActive: true }, 'publish')}
          disabled={!!bulk.loading}
          className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
        >
          {bulk.loading === 'publish' ? 'Updating…' : 'Publish'}
        </button>
        <button
          onClick={() => bulk.patch({ isActive: false }, 'unpublish')}
          disabled={!!bulk.loading}
          className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
        >
          {bulk.loading === 'unpublish' ? 'Updating…' : 'Unpublish'}
        </button>
        <button
          onClick={bulk.remove}
          disabled={!!bulk.loading}
          className="bg-oxblood/70 text-cream border border-oxblood rounded-full px-3 py-1.5 text-[12px] hover:bg-oxblood transition-colors disabled:opacity-50"
        >
          {bulk.loading === 'delete' ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
