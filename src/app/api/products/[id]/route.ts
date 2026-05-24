import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import Review from '@/models/Review';
import User from '@/models/User';
import { getSessionUser } from '@/lib/getSessionUser';
import { withAdminNonDemo } from '@/lib/api-handler';
import {
  coerceProductInput,
  productRecordFromFormData,
} from '@/lib/products/parse-form-input';
import { productInputSchema } from '@/lib/products/schema';

// Next 15+ params are async — must be awaited inside the handler.
type RouteContext = { params: Promise<{ id: string }> };

// GET /api/products/:id — product detail with attached reviews.
export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const reviews = await Review.find({ product: id });

    return NextResponse.json({ ...product.toJSON(), reviews });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// PATCH /api/products/:id — admin-only partial update for isActive and
// isFeatured toggles only. Price-edits used to ride this endpoint, but the
// `price` field is now stamped by the model's pre-validate hook from the
// canonical pricing fields — a direct PATCH would persist briefly and then
// get clobbered on the next full save. Admins edit price through the full
// PUT form going forward.
export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
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
export const DELETE = withAdminNonDemo(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    await Product.findByIdAndDelete(id);
    return NextResponse.json({ data: { id }, message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to delete product' }, { status: 500 });
  }
});

// PUT /api/products/:id — admin-only update from the dashboard form. Runs
// through the same Zod schema as POST, then preserves rating + images from
// the persisted doc (those aren't form-editable) and falls back to existing
// boolean toggle values when the form doesn't submit them.
export const PUT = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
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
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({ message: first?.message ?? 'Invalid input' }, { status: 400 });
    }

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
    console.error(error);
    return NextResponse.json({ message: 'Failed to update product' }, { status: 500 });
  }
});

// POST /api/products/:id — submit a review. Updates product.rating using a
// proper running mean: (stored_avg * existing_count + new_rating) / (existing_count + 1).
export const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = sessionUser;
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
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

    // Running mean: (old_avg × n + new_rating) / (n + 1)
    const existingCount = await Review.countDocuments({ product: id });
    const newRating =
      existingCount > 0
        ? Math.round(((product.rating * existingCount + parsedRating) / (existingCount + 1)) * 100) / 100
        : parsedRating;

    product.rating = newRating;
    await product.save();

    const reviewer = await User.findById(userId).select('name').lean<{ name?: string }>();
    const review = new Review({
      user: userId,
      product: id,
      rating: parsedRating,
      comment,
      authorNameSnapshot: reviewer?.name?.trim() || '',
    });
    await review.save();

    return NextResponse.json({ data: product }, { status: 201 });
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
    console.error(error);
    return NextResponse.json({ message: 'Failed to create review' }, { status: 500 });
  }
};
