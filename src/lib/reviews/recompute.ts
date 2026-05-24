import mongoose, { type Types } from 'mongoose';

import Product from '@/models/Product';
import Review from '@/models/Review';
import { roundMoney } from '@/lib/money';

// Single source of truth for keeping `product.rating` in sync with the
// underlying Review collection. Previously this was split into two paths
// — a running-mean recompute on review-create and an aggregate recompute
// on edit/delete — that could quietly drift on rounding. Routing both
// through the aggregate path costs one extra query on create but the math
// can't disagree with the persisted reviews.
export async function recomputeProductRating(
  productId: Types.ObjectId | string,
): Promise<number> {
  const matchId =
    typeof productId === 'string'
      ? new mongoose.Types.ObjectId(productId)
      : productId;

  const result = (await Review.aggregate([
    { $match: { product: matchId } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ])) as { avg: number }[];

  const rating = result.length > 0 ? roundMoney(result[0]?.avg ?? 0) : 0;
  await Product.findByIdAndUpdate(matchId, { rating });
  return rating;
}
