import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const ORDER_STATUSES = [
  'Pending',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
] as const;

export const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Apple Pay',
  'PayPal',
  'Crypto',
] as const;

export const PAYMENT_STATUSES = [
  'Pending',
  'Completed',
  'Failed',
  'Refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type OrderItem = {
  product: Types.ObjectId;
  name: string;
  qty: number;
  image: string;
  price: number;
  productType: string;
};

export type PaymentResult = {
  status: PaymentStatus;
  transactionId?: string;
  amountPaid: number;
  currency: string;
  paymentDate: Date;
};

export type Order = {
  user: Types.ObjectId;
  orderItems: OrderItem[];
  subtotal: number;
  tax: number;
  totalCost: number;
  isPaid: boolean;
  paidAt?: Date;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentResult: PaymentResult;
  pickupLocation: string;
  pickedUp: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDocument = HydratedDocument<Order>;

const OrderItemSchema = new Schema<OrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      required: [true, 'Product is required'],
      ref: 'Product',
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number'],
    },
    productType: {
      type: String,
      required: [true, 'Product type is required'],
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const PaymentResultSchema = new Schema<PaymentResult>(
  {
    status: {
      type: String,
      required: true,
      default: 'Pending',
      enum: [...PAYMENT_STATUSES],
    },
    transactionId: {
      type: String,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid must be a positive number'],
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const OrderSchema = new Schema<Order>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, 'User is required'],
      ref: 'User',
    },
    orderItems: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be a positive number'],
    },
    tax: {
      type: Number,
      required: [true, 'Tax is required'],
      min: [0, 'Tax must be a positive number'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost must be a positive number'],
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
      enum: [...ORDER_STATUSES],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: [...PAYMENT_METHODS],
    },
    paymentResult: {
      type: PaymentResultSchema,
      required: true,
    },
    pickupLocation: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    pickedUp: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const OrderModel =
  (models.Order as Model<Order> | undefined) ||
  model<Order>('Order', OrderSchema);

export default OrderModel;
