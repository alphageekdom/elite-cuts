import { Schema, model, models } from 'mongoose';

const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [
      {
        product: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        productType: { type: String, required: true },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    orderStatus: {
      type: String,
      required: true,
      default: 'Pending',
      enum: ['Pending', 'Ready for Pickup', 'Completed', 'Cancelled'],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['Credit Card', 'Debit Card', 'Apple Pay', 'PayPal', 'Crypto'],
    },
    paymentResult: {
      status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
      },
      transactionId: { type: String, required: false },
      amountPaid: { type: Number, required: true },
      currency: { type: String, required: true, default: 'USD' },
      paymentDate: { type: Date, default: Date.now },
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    pickedUp: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Order = models.Order || model('Order', OrderSchema);

export default Order;
