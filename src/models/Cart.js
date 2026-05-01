import { Schema, model, models } from 'mongoose';

const CartItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const CartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [CartItemSchema],
});

const Cart = models.Cart || model('Cart', CartSchema);

export default Cart;
