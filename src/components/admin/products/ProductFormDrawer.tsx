'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { PRODUCT_CATEGORIES } from '@/lib/admin/constants';
import {
  MEAT_QUALITY_TIERS,
  PRICING_TYPES,
  PRICING_TYPE_LABEL,
  QUALITY_TIER_LABEL,
  type MeatQualityTier,
  type PricingType,
} from '@/lib/products/constants';
import {
  flattenProductIssues,
  productInputSchema,
} from '@/lib/products/schema';
import { coerceProductInput } from '@/lib/products/parse-form-input';
import { checkPriceBand, PRICE_BAND_FIELD } from '@/lib/products/price-bands';
import { inputCls, Toggle, DrawerSection, DrawerField } from '@/components/admin/AdminForm';
import { SelectField } from '@/components/ui/SelectField';
import { DrawerHeader, DrawerBody, DrawerFooter } from '@/components/admin/DrawerChrome';
import type { ProductTableRow } from '@/types/admin';

type Props = {
  product: ProductTableRow | null;
  onClose: () => void;
  onSave: (data: FormData, id?: string) => Promise<void>;
};

function ToggleRow({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-line-soft last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] font-medium tracking-[-0.005em] mb-0.5">{label}</div>
        <div className="text-[12px] text-muted">{desc}</div>
      </div>
      <Toggle checked={on} onChange={onToggle} ariaLabel={label} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[12px] text-oxblood">{message}</p>;
}

// Map of `name -> string` we hand to the Zod schema before submit. Numbers
// stay as strings so the coercer in parse-form-input handles them the same
// way the server does — one validation path, no drift.
function buildRawInput(state: FormState): Record<string, string> {
  const out: Record<string, string> = {
    name: state.name,
    description: state.description,
    category: state.category,
    cutType: state.cutType,
    qualityTier: state.qualityTier,
    pricingType: state.pricingType,
    stock: state.stock || '0',
    sku: state.sku,
    gradeBreed: state.gradeBreed,
    supplier: state.supplier,
    parLevel: state.parLevel,
    reorderPoint: state.reorderPoint,
    isFeatured: state.isFeatured ? 'true' : 'false',
    isActive: state.isActive ? 'true' : 'false',
    isAged: state.isAged ? 'true' : 'false',
    isNewArrival: state.isNewArrival ? 'true' : 'false',
  };
  // Per-type numeric fields — only attach the ones the schema cares about
  // for the chosen pricingType to keep the error map narrow.
  for (const [k, v] of Object.entries(state.pricing)) {
    if (v) out[k] = v;
  }
  if (state.includedItems.trim()) out.includedItems = state.includedItems;
  return out;
}

type PricingFields = {
  packagePrice: string;
  packageWeightLb: string;
  pricePerLb: string;
  estimatedWeightLb: string;
  averageWeightLb: string;
  minWeightLb: string;
  maxWeightLb: string;
  unitPrice: string;
  bundlePrice: string;
};

const EMPTY_PRICING: PricingFields = {
  packagePrice: '',
  packageWeightLb: '',
  pricePerLb: '',
  estimatedWeightLb: '',
  averageWeightLb: '',
  minWeightLb: '',
  maxWeightLb: '',
  unitPrice: '',
  bundlePrice: '',
};

type FormState = {
  name: string;
  description: string;
  category: string;
  cutType: string;
  qualityTier: string;
  pricingType: string;
  pricing: PricingFields;
  includedItems: string; // pipe-separated for bundles
  stock: string;
  sku: string;
  gradeBreed: string;
  supplier: string;
  parLevel: string;
  reorderPoint: string;
  isFeatured: boolean;
  isActive: boolean;
  isAged: boolean;
  isNewArrival: boolean;
};

function initialState(product: ProductTableRow | null): FormState {
  return {
    name:          product?.name ?? '',
    description:   product?.description ?? '',
    category:      product?.category ?? PRODUCT_CATEGORIES[0],
    cutType:       product?.cutType ?? '',
    qualityTier:   product?.qualityTier ?? 'standard',
    pricingType:   product?.pricingType ?? '',
    pricing: {
      packagePrice:      product?.packagePrice?.toFixed(2) ?? '',
      packageWeightLb:   product?.packageWeightLb ? String(product.packageWeightLb) : '',
      pricePerLb:        product?.pricePerLb?.toFixed(2) ?? '',
      estimatedWeightLb: product?.estimatedWeightLb ? String(product.estimatedWeightLb) : '',
      averageWeightLb:   product?.averageWeightLb ? String(product.averageWeightLb) : '',
      minWeightLb:       product?.minWeightLb ? String(product.minWeightLb) : '',
      maxWeightLb:       product?.maxWeightLb ? String(product.maxWeightLb) : '',
      unitPrice:         product?.unitPrice?.toFixed(2) ?? '',
      bundlePrice:       product?.bundlePrice?.toFixed(2) ?? '',
    },
    includedItems: product?.includedItems?.join('|') ?? '',
    stock:         product ? String(product.stockCount) : '',
    sku:           product?.sku ?? '',
    gradeBreed:    product?.gradeBreed ?? '',
    supplier:      product?.supplier ?? '',
    parLevel:      product?.parLevel ? String(product.parLevel) : '',
    reorderPoint:  product?.reorderPoint ? String(product.reorderPoint) : '',
    isFeatured:    product?.isFeatured ?? false,
    isActive:      product?.isActive ?? true,
    isAged:        product?.isAged ?? false,
    isNewArrival:  product?.isNewArrival ?? false,
  };
}

export default function ProductFormDrawer({ product, onClose, onSave }: Props) {
  const isEdit = product !== null;

  const [state, setState] = useState<FormState>(() => initialState(product));
  const setPricing = (key: keyof PricingFields, value: string) =>
    setState((s) => ({ ...s, pricing: { ...s.pricing, [key]: value } }));
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    // Defer the state update so the setState lands async (rule-clean) — the
    // URL list still pairs with its own revoke cleanup below for the previous
    // urls held by state. useMemo isn't safe here because React reserves the
    // right to recompute, which would leak object URLs.
    const id = setTimeout(() => setPreviewUrls(urls), 0);
    return () => {
      clearTimeout(id);
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    // Pre-submit Zod check — same schema the API route runs server-side.
    // Field-level errors render inline; the first issue also flashes as a
    // toast so the admin notices when an error sits below the fold.
    const raw = buildRawInput(state);
    const parsed = productInputSchema.safeParse(coerceProductInput(raw));
    if (!parsed.success) {
      const flat = flattenProductIssues(parsed.error.issues);
      setErrors(flat);
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? 'Fix the highlighted fields and try again');
      return;
    }
    setErrors({});

    const fd = new FormData();
    for (const [key, value] of Object.entries(raw)) fd.append(key, value);
    for (const file of imageFiles) fd.append('images', file);

    setSaving(true);
    try {
      await onSave(fd, product?.id);
    } finally {
      setSaving(false);
    }
  }

  const pricingType = state.pricingType as PricingType | '';

  // Soft price-band warning — non-blocking; the admin can still save a
  // genuinely-low promo price. Reads the canonical pricing field for the
  // active type (packagePrice / pricePerLb / unitPrice / bundlePrice) and
  // compares against the realistic band for the category.
  const priceBandWarning = useMemo(() => {
    if (!pricingType) return null;
    const fieldName = PRICE_BAND_FIELD[pricingType];
    const raw = state.pricing[fieldName];
    const parsed = raw ? Number(raw) : NaN;
    return checkPriceBand({
      category: state.category,
      pricingType,
      value: Number.isFinite(parsed) ? parsed : undefined,
    });
  }, [pricingType, state.category, state.pricing]);

  return (
    <>
      <DrawerHeader
        eyebrow={isEdit ? 'Edit product' : 'Add new'}
        title={
          isEdit
            ? <em className="italic font-normal text-oxblood">{product.name}</em>
            : <>New <em className="italic font-normal text-oxblood">product</em></>
        }
        titleId="product-form-title"
        onClose={onClose}
      />

      <DrawerBody>

        <DrawerSection label="Basic information">
          <DrawerField label="Product name">
            <input
              type="text"
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Whole Fryer Chicken"
              className={inputCls}
            />
            <FieldError message={errors.name} />
          </DrawerField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DrawerField label="Category">
              <SelectField
                value={state.category}
                onChange={(e) => setField('category', e.target.value)}
              >
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </SelectField>
              <FieldError message={errors.category} />
            </DrawerField>
            <DrawerField label="Cut type">
              <input
                type="text"
                value={state.cutType}
                onChange={(e) => setField('cutType', e.target.value)}
                placeholder="e.g. Ribeye, Whole Bird, Bacon"
                className={inputCls}
              />
              <FieldError message={errors.cutType} />
            </DrawerField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DrawerField label="Quality tier">
              <SelectField
                value={state.qualityTier}
                onChange={(e) => setField('qualityTier', e.target.value as MeatQualityTier)}
              >
                {MEAT_QUALITY_TIERS.map((t) => (
                  <option key={t} value={t}>{QUALITY_TIER_LABEL[t]}</option>
                ))}
              </SelectField>
              <FieldError message={errors.qualityTier} />
            </DrawerField>
            <DrawerField label="SKU">
              <input type="text" value={state.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="SKU-0033" className={inputCls} />
              <FieldError message={errors.sku} />
            </DrawerField>
          </div>
          <DrawerField label="Description">
            <textarea
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Describe the cut, sourcing, and any preparation notes…"
              className={`${inputCls} resize-y min-h-20`}
            />
            <FieldError message={errors.description} />
          </DrawerField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DrawerField label="Grade / breed">
              <input type="text" value={state.gradeBreed} onChange={(e) => setField('gradeBreed', e.target.value)} placeholder="e.g. USDA Prime, Berkshire" className={inputCls} />
            </DrawerField>
            <DrawerField label="Supplier">
              <input type="text" value={state.supplier} onChange={(e) => setField('supplier', e.target.value)} placeholder="e.g. Hartwell Ranch" className={inputCls} />
            </DrawerField>
          </div>
        </DrawerSection>

        <DrawerSection label="Pricing">
          <DrawerField label="Pricing model">
            <SelectField
              value={state.pricingType}
              onChange={(e) => {
                // Switching pricing model resets per-type fields so a stale
                // packagePrice from an aborted fixed_package draft doesn't
                // tag along to a per_lb save. The model accepts the extras
                // silently, but they'd show up in CSV exports and confuse
                // any future analytics that key on the active type's fields.
                setState((s) => ({
                  ...s,
                  pricingType: e.target.value,
                  pricing: EMPTY_PRICING,
                  includedItems: '',
                }));
              }}
            >
              <option value="" disabled>Pick a pricing model…</option>
              {PRICING_TYPES.map((t) => (
                <option key={t} value={t}>{PRICING_TYPE_LABEL[t]}</option>
              ))}
            </SelectField>
            <FieldError message={errors.pricingType} />
          </DrawerField>

          {pricingType === 'fixed_package' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DrawerField label="Package price ($)">
                <input type="number" step="0.01" min="0" value={state.pricing.packagePrice}
                  onChange={(e) => setPricing('packagePrice', e.target.value)} placeholder="8.99" className={inputCls} />
                <FieldError message={errors.packagePrice} />
              </DrawerField>
              <DrawerField label="Package weight (lb)">
                <input type="number" step="0.01" min="0" value={state.pricing.packageWeightLb}
                  onChange={(e) => setPricing('packageWeightLb', e.target.value)} placeholder="1.5" className={inputCls} />
                <FieldError message={errors.packageWeightLb} />
              </DrawerField>
            </div>
          )}

          {pricingType === 'per_lb' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DrawerField label="Price per pound ($)">
                  <input type="number" step="0.01" min="0" value={state.pricing.pricePerLb}
                    onChange={(e) => setPricing('pricePerLb', e.target.value)} placeholder="24.99" className={inputCls} />
                  <FieldError message={errors.pricePerLb} />
                </DrawerField>
                <DrawerField label="Estimated weight (lb)">
                  <input type="number" step="0.01" min="0" value={state.pricing.estimatedWeightLb}
                    onChange={(e) => setPricing('estimatedWeightLb', e.target.value)} placeholder="1.0" className={inputCls} />
                  <FieldError message={errors.estimatedWeightLb} />
                </DrawerField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DrawerField label="Min weight (lb)">
                  <input type="number" step="0.01" min="0" value={state.pricing.minWeightLb}
                    onChange={(e) => setPricing('minWeightLb', e.target.value)} placeholder="0.75" className={inputCls} />
                  <FieldError message={errors.minWeightLb} />
                </DrawerField>
                <DrawerField label="Max weight (lb)">
                  <input type="number" step="0.01" min="0" value={state.pricing.maxWeightLb}
                    onChange={(e) => setPricing('maxWeightLb', e.target.value)} placeholder="1.25" className={inputCls} />
                  <FieldError message={errors.maxWeightLb} />
                </DrawerField>
              </div>
            </>
          )}

          {pricingType === 'whole_item_by_weight' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DrawerField label="Price per pound ($)">
                  <input type="number" step="0.01" min="0" value={state.pricing.pricePerLb}
                    onChange={(e) => setPricing('pricePerLb', e.target.value)} placeholder="2.99" className={inputCls} />
                  <FieldError message={errors.pricePerLb} />
                </DrawerField>
                <DrawerField label="Average weight (lb)">
                  <input type="number" step="0.01" min="0" value={state.pricing.averageWeightLb}
                    onChange={(e) => setPricing('averageWeightLb', e.target.value)} placeholder="3.75" className={inputCls} />
                  <FieldError message={errors.averageWeightLb} />
                </DrawerField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DrawerField label="Min weight (lb)">
                  <input type="number" step="0.01" min="0" value={state.pricing.minWeightLb}
                    onChange={(e) => setPricing('minWeightLb', e.target.value)} placeholder="3" className={inputCls} />
                  <FieldError message={errors.minWeightLb} />
                </DrawerField>
                <DrawerField label="Max weight (lb)">
                  <input type="number" step="0.01" min="0" value={state.pricing.maxWeightLb}
                    onChange={(e) => setPricing('maxWeightLb', e.target.value)} placeholder="4.5" className={inputCls} />
                  <FieldError message={errors.maxWeightLb} />
                </DrawerField>
              </div>
            </>
          )}

          {pricingType === 'each' && (
            <DrawerField label="Unit price ($)">
              <input type="number" step="0.01" min="0" value={state.pricing.unitPrice}
                onChange={(e) => setPricing('unitPrice', e.target.value)} placeholder="9.99" className={inputCls} />
              <FieldError message={errors.unitPrice} />
            </DrawerField>
          )}

          {pricingType === 'bundle' && (
            <>
              <DrawerField label="Bundle price ($)">
                <input type="number" step="0.01" min="0" value={state.pricing.bundlePrice}
                  onChange={(e) => setPricing('bundlePrice', e.target.value)} placeholder="89.99" className={inputCls} />
                <FieldError message={errors.bundlePrice} />
              </DrawerField>
              <DrawerField label="Included items (one per line)">
                <textarea
                  value={state.includedItems.split('|').join('\n')}
                  onChange={(e) => setField('includedItems', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean).join('|'))}
                  placeholder={'2.5 lb chicken thigh pack\n1 lb ground beef pack\n1 lb sausage pack'}
                  className={`${inputCls} resize-y min-h-24`}
                />
                <FieldError message={errors.includedItems} />
              </DrawerField>
            </>
          )}

          {priceBandWarning && (
            <div className="flex items-start gap-2 rounded-md bg-camel/10 px-3 py-2 text-[12px] text-camel-deep">
              <span aria-hidden className="mt-0.5">⚠</span>
              <span>{priceBandWarning}</span>
            </div>
          )}
        </DrawerSection>

        <DrawerSection label="Inventory">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DrawerField label="Current stock">
              <input
                type="number"
                min="0"
                value={state.stock}
                onChange={(e) => setField('stock', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
              <FieldError message={errors.stock} />
            </DrawerField>
            <DrawerField label="Par level">
              <input type="number" min="0" value={state.parLevel} onChange={(e) => setField('parLevel', e.target.value)} placeholder="25" className={inputCls} />
            </DrawerField>
            <DrawerField label="Reorder point">
              <input type="number" min="0" value={state.reorderPoint} onChange={(e) => setField('reorderPoint', e.target.value)} placeholder="8" className={inputCls} />
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
                  {/* Stays a plain <img> on purpose: the src is a blob: object URL
                      from URL.createObjectURL above, pointing at a File the admin just
                      picked. next/image can't optimize a blob: URL — there's no origin
                      to fetch and nothing to cache — and routing it through the
                      optimizer would only add a hop for bytes already in memory. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {previewUrls[i] && <img src={previewUrls[i]} alt={f.name} className="w-full h-full object-cover" />}
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
            on={state.isActive}
            onToggle={() => setField('isActive', !state.isActive)}
          />
          <ToggleRow
            label="Featured"
            desc="Appears in the Featured Cuts section on the homepage"
            on={state.isFeatured}
            onToggle={() => setField('isFeatured', !state.isFeatured)}
          />
          <ToggleRow
            label="Aged"
            desc="Marks the cut as dry-aged or wet-aged in the catalog"
            on={state.isAged}
            onToggle={() => setField('isAged', !state.isAged)}
          />
          <ToggleRow
            label="New arrival"
            desc="Surfaces a 'New' chip on the product card"
            on={state.isNewArrival}
            onToggle={() => setField('isNewArrival', !state.isNewArrival)}
          />
        </DrawerSection>
      </DrawerBody>

      <DrawerFooter
        onCancel={onClose}
        onSubmit={handleSave}
        submitLabel={isEdit ? 'Save changes' : 'Save product'}
        busyLabel="Saving…"
        busy={saving}
      />
    </>
  );
}
