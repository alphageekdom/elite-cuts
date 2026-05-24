import { z } from 'zod';

// Single source of truth for stocktake POST input. Consumed by:
//   - `src/app/api/stocktakes/route.ts` (POST) — commit a recount session
//
// No client-side pre-submit parser exists today (the recount drawer ships
// every entry the admin typed without per-field error chrome), so the
// schema is server-side only for now. If the drawer ever surfaces inline
// errors, it should call `safeParse` like every other admin domain does.

const NOTE_MAX = 500;
const COUNTED_STOCK_MAX = 1_000_000;

const productIdField = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'productId is not a valid id');

const countedStockField = z
  .number({ message: 'countedStock must be a non-negative integer' })
  .int('countedStock must be a non-negative integer')
  .min(0, 'countedStock must be a non-negative integer')
  .max(COUNTED_STOCK_MAX, `countedStock must be ${COUNTED_STOCK_MAX} or fewer`);

const entryField = z.object({
  productId: productIdField,
  countedStock: countedStockField,
});

const noteField = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().max(NOTE_MAX, `note must be ${NOTE_MAX} characters or fewer`));

export const stocktakeCreateSchema = z.object({
  entries: z.array(entryField).min(1, 'At least one entry is required'),
  note: noteField.optional().default(''),
});

export type StocktakeCreateInput = z.infer<typeof stocktakeCreateSchema>;
