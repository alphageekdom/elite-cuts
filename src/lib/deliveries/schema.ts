import { z } from 'zod';

import { DELIVERY_STATUSES } from '@/lib/deliveries/constants';

// Single source of truth for delivery POST/PATCH input. Consumed by:
//   - `src/app/api/deliveries/route.ts` (POST) — log a new delivery
//   - `src/app/api/deliveries/[id]/route.ts` (PATCH) — receive an existing
//     delivery (status flip + optional receivedQty)
//   - `src/components/admin/inventory/InventoryReorderDrawer.tsx` — the
//     log-delivery / reorder drawer's pre-submit check
//   - `src/components/admin/inventory/DeliveryReceiveCard.tsx` — the
//     receive-step prompt's pre-submit check
//
// `status` is gated against `DELIVERY_STATUSES` on both verbs — the old
// hand-rolled POST validator skipped this gate while the PATCH route
// enforced it, so a tampered POST could set `received` (which auto-stocks)
// against any status string the body carried.

const SUPPLIER_MAX = 80;
const SUPPLIER_SUFFIX_MAX = 80;
const DETAIL_MAX = 240;
// 100k is comfortably above any realistic single-delivery qty (whole
// hindquarters trend ~150–250 units of stockable retail cuts). Caps the
// auto-stock-apply path so a tampered request can't flip a single SKU into
// an arbitrarily large balance.
const RECEIVED_QTY_MAX = 100_000;

const trimMax = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer`));

const supplierField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, 'supplier is required')
      .max(SUPPLIER_MAX, `supplier must be ${SUPPLIER_MAX} characters or fewer`),
  );

const deliveryDateField = z
  .string({ message: 'deliveryDate is required' })
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: 'deliveryDate is not a valid date',
  });

const statusField = z.enum(DELIVERY_STATUSES, {
  message: `status must be one of: ${DELIVERY_STATUSES.join(', ')}`,
});

const productIdField = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'productId is not a valid id');

const receivedQtyField = z
  .number({ message: 'receivedQty must be a non-negative integer' })
  .finite('receivedQty must be a non-negative integer')
  .min(0, 'receivedQty must be a non-negative integer')
  .max(RECEIVED_QTY_MAX, `receivedQty must be ${RECEIVED_QTY_MAX} or fewer`)
  // Floor to integer at the schema boundary so neither the POST nor the
  // PATCH path can land a fractional unit in the audit trail. Both routes
  // used to call `Math.floor` separately — easy to drift.
  .transform((n) => Math.floor(n));

export const deliveryCreateSchema = z.object({
  deliveryDate: deliveryDateField,
  supplier: supplierField,
  supplierSuffix: trimMax(SUPPLIER_SUFFIX_MAX, 'supplierSuffix').optional(),
  detail: trimMax(DETAIL_MAX, 'detail').optional(),
  status: statusField.optional(),
  productId: productIdField.optional(),
  receivedQty: receivedQtyField.optional(),
});

export type DeliveryCreateInput = z.infer<typeof deliveryCreateSchema>;

// PATCH branch — used by the receive-step prompt. `status` is the only
// required field; `receivedQty` is optional and only honored when status
// flips to 'received'.
export const deliveryPatchSchema = z.object({
  status: statusField,
  receivedQty: receivedQtyField.optional(),
});

export type DeliveryPatchInput = z.infer<typeof deliveryPatchSchema>;
