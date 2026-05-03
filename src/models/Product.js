import { Schema, model, models } from 'mongoose';

const PRODUCT_CATEGORIES = [
  'Beef',
  'Pork',
  'Poultry',
  'Lamb',
  'Charcuterie',
  'Other',
];

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name of the meat cut is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category of meat is required'],
      enum: PRODUCT_CATEGORIES,
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
  }
);

const Product = models.Product || model('Product', ProductSchema);

export default Product;
