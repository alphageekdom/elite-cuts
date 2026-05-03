import {
  type HydratedDocument,
  Schema,
  model,
  models,
  type Model,
} from 'mongoose';

export const PRODUCT_CATEGORIES = [
  'Beef',
  'Pork',
  'Poultry',
  'Lamb',
  'Charcuterie',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// Server-side shape: what `.lean()` returns (sans `_id` / `__v`, which the
// Mongoose generic adds back). Field types match the schema below.
export type Product = {
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isAged: boolean;
  // `isNewArrival` not `isNew` — Mongoose reserves `doc.isNew` for its
  // own dirty-tracking; using `isNew` triggers a deprecation warning.
  isNewArrival: boolean;
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
  },
  {
    timestamps: true,
  },
);

// Reuse the cached model in dev — Next.js hot-reload re-evaluates this file
// on every change, and `model()` throws if the same name registers twice.
const ProductModel =
  (models.Product as Model<Product> | undefined) ??
  model<Product>('Product', ProductSchema);

export default ProductModel;
