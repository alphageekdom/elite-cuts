import type { ProductCategory } from '@/lib/admin-constants';

export type ProductTableRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isAged: boolean;
  isNewArrival: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCounts = {
  all: number;
  inStock: number;
  outOfStock: number;
  featured: number;
  avgPrice: number;
};

export type CustomerTableRow = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt?: string;
  defaultCity?: string;
  savedCutsCount: number;
};

export type CustomerCounts = {
  all: number;
  new: number;
  active: number;
  connoisseurPlus: number;
  atRisk: number;
};

export type OrderTableRow = {
  id: string;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    image: string;
    qty: number;
    price: number;
    productType: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  paymentMethod: string;
  pickupLocation: string;
  pickedUp: boolean;
  createdAt: string;
};

export type StatusCounts = {
  all: number;
  pending: number;
  readyForPickup: number;
  completed: number;
  cancelled: number;
};
