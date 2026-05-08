'use client';
import { useState, useRef } from 'react';
import { PRODUCT_CATEGORIES } from '@/lib/admin-constants';
import { toast } from 'sonner';
import type { ProductTableRow } from '@/types/admin';

type Props = {
  product: ProductTableRow | null;
  onClose: () => void;
  onSave: (data: FormData, id?: string) => Promise<void>;
};

const inputCls =
  'w-full border border-line bg-paper font-sans text-[14px] text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors placeholder:text-muted/60';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-line-soft last:border-b-0 last:pb-0 space-y-4">
      <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">{label}</div>
      {children}
    </div>
  );
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-line-soft last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] font-medium tracking-[-0.005em] mb-0.5">{label}</div>
        <div className="text-[12px] text-muted">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`w-11 h-6 rounded-full border relative shrink-0 transition-colors ${
          on ? 'bg-green border-green' : 'bg-cream-deep border-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function ProductFormDrawer({ product, onClose, onSave }: Props) {
  const isEdit = product !== null;

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(product?.category ?? PRODUCT_CATEGORIES[0]);
  const [sku, setSku] = useState(product?.sku ?? '');
  const [gradeBreed, setGradeBreed] = useState(product?.gradeBreed ?? '');
  const [supplier, setSupplier] = useState(product?.supplier ?? '');
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : '');
  const [unit, setUnit] = useState('/lb');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState(product ? String(product.stockCount) : '');
  const [parLevel, setParLevel] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [published, setPublished] = useState(isEdit);
  const [featuredToggle, setFeaturedToggle] = useState(product?.isFeatured ?? false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!name.trim() || !price) {
      toast.error('Name and price are required');
      return;
    }
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('category', category);
    fd.append('description', description.trim());
    fd.append('sku', sku.trim());
    fd.append('gradeBreed', gradeBreed.trim());
    fd.append('supplier', supplier.trim());
    fd.append('price', price);
    fd.append('unit', unit);
    if (comparePrice) fd.append('comparePrice', comparePrice);
    fd.append('stockCount', stock || '0');
    if (parLevel) fd.append('parLevel', parLevel);
    if (reorderPoint) fd.append('reorderPoint', reorderPoint);
    for (const file of imageFiles) fd.append('images', file);
    setSaving(true);
    await onSave(fd, product?.id);
    setSaving(false);
  }

  return (
    <>
      {/* Head */}
      <div className="flex items-center justify-between gap-4 px-8 py-6 border-b border-line-soft bg-paper shrink-0">
        <div>
          <div className="font-display italic text-[13px] text-camel mb-1">
            {isEdit ? '✦ Edit product' : '✦ Add new'}
          </div>
          <div className="font-display text-[22px] font-medium tracking-[-0.015em]">
            {isEdit ? (
              <><em className="italic text-oxblood font-normal">{product.name}</em></>
            ) : (
              <>New <em className="italic text-oxblood font-normal">product</em></>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-cream border border-line text-ink grid place-items-center hover:border-ink transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">

        <DrawerSection label="Basic information">
          <DrawerField label="Product name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 28-Day Dry-Aged Ribeye"
              className={inputCls}
            />
          </DrawerField>
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="SKU">
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-0033" className={inputCls} />
            </DrawerField>
            <DrawerField label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectCls}
              >
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </DrawerField>
          </div>
          <DrawerField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the cut, sourcing, and any preparation notes…"
              className={`${inputCls} resize-y min-h-20`}
            />
          </DrawerField>
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="Grade / breed">
              <input type="text" value={gradeBreed} onChange={(e) => setGradeBreed(e.target.value)} placeholder="e.g. USDA Prime, Berkshire" className={inputCls} />
            </DrawerField>
            <DrawerField label="Supplier">
              <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Hartwell Ranch" className={inputCls} />
            </DrawerField>
          </div>
        </DrawerSection>

        <DrawerSection label="Pricing">
          <div className="grid grid-cols-3 gap-4">
            <DrawerField label="Price ($)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="42.99"
                className={inputCls}
              />
            </DrawerField>
            <DrawerField label="Unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectCls}>
                <option>/lb</option>
                <option>/ea</option>
                <option>/kg</option>
              </select>
            </DrawerField>
            <DrawerField label="Compare price">
              <input type="number" step="0.01" min="0" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="49.99" className={inputCls} />
            </DrawerField>
          </div>
          <p className="text-[12px] text-muted">
            Compare price shows a strikethrough on the product card, implying a discount.
          </p>
        </DrawerSection>

        <DrawerSection label="Inventory">
          <div className="grid grid-cols-3 gap-4">
            <DrawerField label="Current stock">
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </DrawerField>
            <DrawerField label="Par level">
              <input type="number" min="0" value={parLevel} onChange={(e) => setParLevel(e.target.value)} placeholder="25" className={inputCls} />
            </DrawerField>
            <DrawerField label="Reorder point">
              <input type="number" min="0" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} placeholder="8" className={inputCls} />
            </DrawerField>
          </div>
          <p className="text-[12px] text-muted">
            Low stock alerts trigger when stock falls below the reorder point.
          </p>
        </DrawerSection>

        <DrawerSection label="Images">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) setImageFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
            }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-camel hover:bg-camel/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-cream-deep text-ink-soft grid place-items-center mx-auto mb-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-[13px] text-muted">
              <strong className="text-ink font-medium">Click to upload</strong> or drag and drop
              <br />PNG, JPG up to 5MB · First image is the thumbnail
            </p>
          </div>
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {imageFiles.map((f, i) => (
                <div key={i} className="relative group w-16 h-16 rounded-md overflow-hidden bg-cream-deep border border-line shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute inset-0 bg-ink/60 text-cream opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </DrawerSection>

        <DrawerSection label="Visibility">
          <ToggleRow
            label="Published"
            desc="Product is visible on the storefront and available for purchase"
            on={published}
            onToggle={() => setPublished((v) => !v)}
          />
          <ToggleRow
            label="Featured"
            desc="Appears in the Featured Cuts section on the homepage"
            on={featuredToggle}
            onToggle={() => setFeaturedToggle((v) => !v)}
          />
          <ToggleRow
            label="Members only"
            desc="Only visible to Connoisseur tier and above"
            on={membersOnly}
            onToggle={() => setMembersOnly((v) => !v)}
          />
        </DrawerSection>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-8 py-4.5 bg-paper border-t border-line-soft shrink-0">
        <button
          onClick={onClose}
          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!saving && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}
        </button>
      </div>
    </>
  );
}
