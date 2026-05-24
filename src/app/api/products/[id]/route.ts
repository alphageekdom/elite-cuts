import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import Review from '@/models/Review';
import User from '@/models/User';
import { getSessionUser } from '@/lib/getSessionUser';
import {
  parseObjectId,
  withAdminNonDemo,
  zodBadRequest,
  type RouteContext,
} from '@/lib/api-handler';
import {
  coerceProductInput,
  productRecordFromFormData,
} from '@/lib/products/parse-form-input';
import { productInputSchema } from '@/lib/products/schema';
import { recomputeProductRating } from '@/lib/reviews/recompute';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';

// The unique compound index on (user, product) caps reviews per product, but a
// signed-in customer can still walk the catalog and review every cut in a
// loop — each create runs `recomputeProductRating` aggregation. Throttle on
// userId and IP so a script can plant at most a handful per hour.
const REVIEW_USER_MAX_PER_HOUR = 5;
const REVIEW_IP_MAX_PER_HOUR = 10;

type Ctx = RouteContext<{ id: string }>;

// GET /api/products/:id — product detail with attached reviews.
export const GET = async (_request: NextRequest, { params }: Ctx) => {
  try {
    await connectDB();
    const { id } = await params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const reviews = await Review.find({ product: id });

    return NextResponse.json({ ...product.toJSON(), reviews });
  } catch (error) {
    console.error('[products/:id GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// PATCH /api/products/:id — admin-only partial update for isActive and
// isFeatured toggles only. Price-edits used to ride this endpoint, but the
// `price` field is now stamped by the model's pre-validate hook from the
// canonical pricing fields — a direct PATCH would persist briefly and then
// get clobbered on the next full save. Admins edit price through the full
// PUT form going forward.
export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const body = (await request.json()) as {
      isActive?: boolean;
      isFeatured?: boolean;
    };

    const update: Record<string, unknown> = {};
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (body.isFeatured !== undefined) update.isFeatured = body.isFeatured;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update' }, { status: 400 });
    }

    const product = await Product.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ data: { id: String(product._id), ...update } });
  } catch (error) {
    console.error('[products/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// DELETE /api/products/:id — admin-only.
export const DELETE = withAdminNonDemo<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    await Product.findByIdAndDelete(id);
    return NextResponse.json({ data: { id }, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('[products/:id DELETE]', error);
    return NextResponse.json({ message: 'Failed to delete product' }, { status: 500 });
  }
});

// PUT /api/products/:id — admin-only update from the dashboard form. Runs
// through the same Zod schema as POST, then preserves rating + images from
// the persisted doc (those aren't form-editable) and falls back to existing
// boolean toggle values when the form doesn't submit them.
export const PUT = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;
    const formData = await request.formData();

    const existingProduct = await Product.findById(id).lean();
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const record = productRecordFromFormData(formData);
    // Empty slug on an edit means "keep the existing slug", not "derive a
    // new one from name". The coercer would otherwise re-derive on every
    // rename and break external references.
    if (!record.slug?.trim()) record.slug = existingProduct.slug;

    const parsed = productInputSchema.safeParse(coerceProductInput(record));
    if (!parsed.success) return zodBadRequest(parsed.error);

    // Preserve existing toggle values when the form didn't submit them
    // (separate toggles, not part of the main form payload).
    const { stock, ...rest } = parsed.data;
    const update: Record<string, unknown> = {
      ...rest,
      stockCount: stock,
      rating: existingProduct.rating,
      images: existingProduct.images,
    };
    if (!formData.has('isFeatured')) update.isFeatured = existingProduct.isFeatured;
    if (!formData.has('isActive'))   update.isActive   = existingProduct.isActive;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      update,
      { returnDocument: 'after', runValidators: true },
    );
    return NextResponse.json({ data: updatedProduct });
  } catch (error) {
    console.error('[products/:id PUT]', error);
    return NextResponse.json({ message: 'Failed to update product' }, { status: 500 });
  }
});

// POST /api/products/:id — submit a review. Rating recompute goes through the
// shared `recomputeProductRating` so the create path can't drift from the
// edit/delete path.
export const POST = async (request: NextRequest, { params }: Ctx) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = sessionUser;
    const { id } = await params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const ip = clientIpFromHeaders(request.headers);
    const userLimit = rateLimit({
      key: `review:user:${userId}`,
      max: REVIEW_USER_MAX_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    const ipLimit = rateLimit({
      key: `review:ip:${ip}`,
      max: REVIEW_IP_MAX_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    if (!userLimit.ok || !ipLimit.ok) {
      const retryAfterSec = Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec);
      return NextResponse.json(
        { message: 'Too many reviews, please try again later' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const { rating, comment } = (await request.json()) as {
      rating?: number | string;
      comment?: string;
    };

    if (!rating || !comment) {
      return NextResponse.json(
        { message: 'Rating and comment are required' },
        { status: 400 },
      );
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { message: 'Comment must be 1000 characters or fewer' },
        { status: 400 },
      );
    }

    await connectDB();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const parsedRating = Number.parseFloat(String(rating));
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ message: 'Invalid rating value' }, { status: 400 });
    }

    const reviewer = await User.findById(userId).select('name').lean<{ name?: string }>();
    const review = new Review({
      user: userId,
      product: id,
      rating: parsedRating,
      comment,
      authorNameSnapshot: reviewer?.name?.trim() || '',
    });
    await review.save();

    // Recompute after the review is persisted so the aggregate sees it.
    await recomputeProductRating(product._id as mongoose.Types.ObjectId);

    // Re-read the product so the response reflects the new rating.
    const refreshed = await Product.findById(id);
    return NextResponse.json({ data: refreshed }, { status: 201 });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: unknown }).code === 11000
    ) {
      return NextResponse.json(
        { message: 'You have already reviewed this product' },
        { status: 409 },
      );
    }
    console.error('[products/:id POST review]', error);
    return NextResponse.json({ message: 'Failed to create review' }, { status: 500 });
  }
};
