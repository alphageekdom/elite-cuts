import { Schema, model, models } from 'mongoose';

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name of the meat cut is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Type of meat is required'],
      enum: ['Beef', 'Pork', 'Chicken', 'Lamb', 'Other'], // Enum to specify the type of meats available
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price of the meat cut is required'],
      min: [0, 'Price must be a positive number'],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description of the meat is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    inStock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock must be a positive number'],
    },
    isFeatured: {
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
