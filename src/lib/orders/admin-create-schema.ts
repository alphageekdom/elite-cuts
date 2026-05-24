import { z } from 'zod';

import { MAX_PER_LINE } from '@/lib/shopConfig';

// Single source of truth for the admin walk-in order POST body. Consumed by:
//   - `src/app/api/orders/route.ts` (POST) — admin creates an order on a
//     customer's behalf, optionally already-completed-and-walked-out.
//
// The new-order drawer on the admin orders dashboard doesn't currently call
// `safeParse` pre-submit (the form is small enough that the server-side
// errors land back in a toast), but the schema is shaped so a future client
// check can drop in identically.
//
// The mongoose model on the other side already trims and enums on its own;
// the schema here adds upper bounds on the unchecked free-text fields
// (`contactPhone`, `pickupSlot`, `pickupLocation`, `orderNotes`, the
// delivery address sub-fields) and gates `fulfillmentType` and
// `paymentMethod` to recognized values before they reach `Order.create`.

export const ADMIN_INITIAL_STATUSES = ['Order Placed', 'Completed'] as const;
export type AdminInitialStatus = (typeof ADMIN_INITIAL_STATUSES)[number];

const FULFILLMENT_TYPES = ['pickup', 'delivery'] as const;

const CONTACT_PHONE_MAX = 40;
const PICKUP_LOCATION_MAX = 120;
const PICKUP_SLOT_MAX = 60;
const ORDER_NOTES_MAX = 1000;
const ADDRESS_LINE_MAX = 120;
const CITY_MAX = 80;
const STATE_MAX = 60;
const ZIP_MAX = 20;
const PAYMENT_METHOD_MAX = 40;

const trimMax = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer`));

const objectIdField = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Invalid id');

const itemField = z.object({
  productId: objectIdField,
  qty: z
    .number({ message: 'qty must be an integer' })
    .int('qty must be an integer')
    .min(1, 'qty must be at least 1')
    .max(MAX_PER_LINE, `qty must be ${MAX_PER_LINE} or fewer`),
});

const deliveryAddressField = z.object({
  address1: trimMax(ADDRESS_LINE_MAX, 'address1'),
  address2: trimMax(ADDRESS_LINE_MAX, 'address2').optional(),
  city: trimMax(CITY_MAX, 'city'),
  state: trimMax(STATE_MAX, 'state'),
  zip: trimMax(ZIP_MAX, 'zip'),
});

export const adminCreateOrderSchema = z
  .object({
    userId: objectIdField,
    items: z.array(itemField).min(1, 'items must be a non-empty array'),
    orderStatus: z.enum(ADMIN_INITIAL_STATUSES, {
      message: `orderStatus must be one of: ${ADMIN_INITIAL_STATUSES.join(', ')}`,
    }).optional(),
    paymentMethod: trimMax(PAYMENT_METHOD_MAX, 'paymentMethod').optional(),
    pickupLocation: z
      .string()
      .transform((s) => s.trim())
      .pipe(
        z
          .string()
          .min(1, 'Pickup location is required')
          .max(PICKUP_LOCATION_MAX, `pickupLocation must be ${PICKUP_LOCATION_MAX} characters or fewer`),
      ),
    contactPhone: trimMax(CONTACT_PHONE_MAX, 'contactPhone').optional(),
    fulfillmentType: z.enum(FULFILLMENT_TYPES, {
      message: `fulfillmentType must be one of: ${FULFILLMENT_TYPES.join(', ')}`,
    }).optional(),
    pickupSlot: trimMax(PICKUP_SLOT_MAX, 'pickupSlot').optional(),
    deliveryAddress: deliveryAddressField.optional(),
    orderNotes: trimMax(ORDER_NOTES_MAX, 'orderNotes').optional(),
  })
  .superRefine((obj, ctx) => {
    // A 'delivery' order without an address would silently bypass the
    // delivery-fee branch in `computeOrderTotals` and ship a free-shipping
    // order. Refuse rather than fall through.
    if (obj.fulfillmentType === 'delivery' && !obj.deliveryAddress) {
      ctx.addIssue({
        code: 'custom',
        path: ['deliveryAddress'],
        message: 'deliveryAddress is required when fulfillmentType is "delivery"',
      });
    }
  });

export type AdminCreateOrderInput = z.infer<typeof adminCreateOrderSchema>;
