import {
  type HydratedDocument,
  Schema,
  model,
  models,
  type Model,
} from 'mongoose';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/admin-constants';
import {
  MEAT_QUALITY_TIERS,
  PRICING_TYPES,
  type MeatQualityTier,
  type PricingType,
} from '@/lib/products/constants';
import * as pricing from '@/lib/products/pricing';
import { slugify } from '@/lib/slugify';

export { PRODUCT_CATEGORIES, type ProductCategory };
export { PRICING_TYPES, MEAT_QUALITY_TIERS };
export type { PricingType, MeatQualityTier };

export const PRODUCT_UNITS = ['lb', 'kg', 'each'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

// Server-side shape: what `.lean()` returns (sans `_id` / `__v`, which the
// Mongoose generic adds back). Field types match the schema below.
export type Product = {
  name: string;
  // Stable identity that survives a name change — auto-generated from `name`
  // on first save and never re-derived after. CSV import uses this as the
  // upsert key.
  slug: string;
  category: ProductCategory;
  description: string;
  // Backcompat: stamped by the pre-validate hook from the canonical
  // per-pricingType fields. Phase 2 drops this once the customer UI reads
  // displayPriceLabel directly.
  price: number;
  // Backcompat: stamped from pricingType (lb for weighed cuts, each for
  // each / bundle). Phase 2 drops it.
  unit: ProductUnit;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isAged: boolean;
  // `isNewArrival` not `isNew` — Mongoose reserves `doc.isNew` for its
  // own dirty-tracking; using `isNew` triggers a deprecation warning.
  isNewArrival: boolean;
  isActive: boolean;
  sku?: string;
  gradeBreed?: string;
  supplier?: string;
  parLevel?: number;
  reorderPoint?: number;

  // — Realistic pricing model (Phase 1). Per-type fields are optional at the
  // Mongoose layer; the Zod schema at src/lib/products/schema.ts enforces
  // which combination is required for each pricingType. Pre-existing seed
  // products from before this phase may not have pricingType set — the
  // pre-validate hook leaves their backcompat price/unit untouched in that
  // case.
  pricingType?: PricingType;
  cutType?: string;
  qualityTier?: MeatQualityTier;
  packagePrice?: number;
  packageWeightLb?: number;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  unitPrice?: number;
  bundlePrice?: number;
  includedItems?: string[];

  // Stamped by the pre-validate hook from the per-type fields. Catalog and
  // cart read these in Phase 2 so per-paint compute drops to zero.
  displayPriceLabel?: string;
  displayWeightLabel?: string;
  isEstimatedPrice?: boolean;

  createdAt: Date;
  updatedAt: Date;
};

// Wire / client shape after `convertToSerializableObject` runs over a lean
// doc: `_id` becomes a string, dates are stringified by Next.js when crossing
// the server → client component boundary. Use this type in client components
// and as the prop shape for cards/lists.
export type SerializedProduct = Omit<Product, 'createdAt' | 'updatedAt'> & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

// `HydratedDocument<Product>` is the type for actual Mongoose docs
// (`.findById()` without `.lean()`) — they carry instance methods that lean
// docs do not. Exported for callers that need to call `.save()` etc.
export type ProductDocument = HydratedDocument<Product>;

const ProductSchema = new Schema<Product>(
  {
    name: {
      type: String,
      required: [true, 'Name of the meat cut is required'],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      // Unique with a partial filter so legacy docs that pre-date this field
      // (empty / missing slug) aren't pulled into the uniqueness check. New
      // and updated docs all have a slug — the pre-validate hook below
      // guarantees one whenever name is set — so the live invariant holds.
      index: {
        unique: true,
        partialFilterExpression: { slug: { $type: 'string', $gt: '' } },
      },
    },
    unit: {
      type: String,
      enum: [...PRODUCT_UNITS],
      default: 'lb',
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category of meat is required'],
      // Spread the readonly tuple — Mongoose's enum option expects a mutable
      // string[], and `as const` widens to `readonly string[]`.
      enum: [...PRODUCT_CATEGORIES],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description of the meat is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price of the meat cut is required'],
      min: [0, 'Price must be a positive number'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    images: {
      type: [String],
      default: [],
    },
    stockCount: {
      type: Number,
      required: [true, 'Stock count is required'],
      default: 0,
      min: [0, 'Stock must be a positive number'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isAged: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    gradeBreed: {
      type: String,
      trim: true,
      default: '',
    },
    supplier: {
      type: String,
      trim: true,
      default: '',
    },
    parLevel: {
      type: Number,
      min: 0,
      default: 0,
    },
    reorderPoint: {
      type: Number,
      min: 0,
      default: 0,
    },

    // — Realistic pricing model. Per-type fields stay optional at this
    // layer; the Zod schema enforces per-pricingType requirements.
    pricingType: {
      type: String,
      enum: [...PRICING_TYPES],
      trim: true,
    },
    cutType:     { type: String, trim: true, default: '' },
    qualityTier: { type: String, enum: [...MEAT_QUALITY_TIERS], trim: true },

    packagePrice:      { type: Number, min: 0 },
    packageWeightLb:   { type: Number, min: 0 },
    pricePerLb:        { type: Number, min: 0 },
    estimatedWeightLb: { type: Number, min: 0 },
    averageWeightLb:   { type: Number, min: 0 },
    minWeightLb:       { type: Number, min: 0 },
    maxWeightLb:       { type: Number, min: 0 },
    unitPrice:         { type: Number, min: 0 },
    bundlePrice:       { type: Number, min: 0 },
    includedItems:     { type: [String], default: undefined },

    // Stamped fields — pre-validate hook writes them from the canonical
    // per-type fields whenever pricingType is set.
    displayPriceLabel:  { type: String, trim: true },
    displayWeightLabel: { type: String, trim: true },
    isEstimatedPrice:   { type: Boolean },
  },
  {
    timestamps: true,
  },
);

// Auto-derive slug from name on first save, and stamp backcompat
// price/unit + display labels from the canonical per-pricingType fields
// whenever pricingType is set. Runs at validate time so the resulting
// values satisfy the schema's required + min constraints (e.g. `price`
// stays required for old consumers; the stamp populates it before the
// required check runs).
ProductSchema.pre('validate', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  if (this.pricingType) {
    const view: pricing.PricingView = {
      pricingType: this.pricingType,
      packagePrice: this.packagePrice,
      packageWeightLb: this.packageWeightLb,
      pricePerLb: this.pricePerLb,
      estimatedWeightLb: this.estimatedWeightLb,
      averageWeightLb: this.averageWeightLb,
      minWeightLb: this.minWeightLb,
      maxWeightLb: this.maxWeightLb,
      unitPrice: this.unitPrice,
      bundlePrice: this.bundlePrice,
      includedItems: this.includedItems,
    };
    this.price = pricing.backcompatPrice(view);
    this.unit = pricing.backcompatUnit(view);
    this.displayPriceLabel = pricing.getDisplayPrice(view);
    this.displayWeightLabel = pricing.getDisplayWeight(view);
    this.isEstimatedPrice = pricing.isEstimatedPrice(view);
  }
});

// Reuse the cached model in dev — Next.js hot-reload re-evaluates this file
// on every change, and `model()` throws if the same name registers twice.
const ProductModel =
  (models.Product as Model<Product> | undefined) ??
  model<Product>('Product', ProductSchema);

export default ProductModel;
