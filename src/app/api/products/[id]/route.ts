import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import Review from '@/models/Review';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { productRecordFromFormData, validateProductInput } from '@/lib/product-validate';
import { withAdmin } from '@/lib/api-handler';

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

// PATCH /api/products/:id — admin-only partial update (isActive, isFeatured, price).
export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const body = (await request.json()) as {
      isActive?: boolean;
      isFeatured?: boolean;
      price?: number;
    };

    const update: Record<string, unknown> = {};
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (body.isFeatured !== undefined) update.isFeatured = body.isFeatured;
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return NextResponse.json({ message: 'price must be a non-negative number' }, { status: 400 });
      }
      update.price = body.price;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update' }, { status: 400 });
    }

    const product = await Product.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ id: String(product._id), ...update });
  } catch (error) {
    console.error('[products/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// DELETE /api/products/:id — admin-only.
export const DELETE = withAdmin(async (_request: NextRequest, ctx: unknown) => {
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
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to delete product' }, { status: 500 });
  }
});

// PUT /api/products/:id — admin-only update from the dashboard form.
export const PUT = withAdmin(async (request: NextRequest, ctx: unknown) => {
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

    // rating + images preserved from the existing doc — not editable via the
    // admin form (rating is review-derived; images upload via a separate
    // surface). Slug stays stable across edits so external references hold.
    const record = productRecordFromFormData(formData);
    // The form doesn't surface a slug input, so an empty slug here means
    // "keep the existing slug" rather than "derive a new one from name".
    if (!record.slug.trim()) record.slug = existingProduct.slug ?? '';
    // The form also doesn't submit `isFeatured` or `isActive` (those live
    // on separate toggles). When they're absent, fall back to the persisted
    // value so editing any other field doesn't quietly clear them.
    if (!formData.has('isFeatured')) record.isFeatured = existingProduct.isFeatured ? 'true' : 'false';
    if (!formData.has('isActive'))   record.isActive   = existingProduct.isActive   ? 'true' : 'false';
    const v = validateProductInput(record);
    if (!v.ok) {
      return NextResponse.json({ message: v.error }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        slug: v.data.slug,
        name: v.data.name,
        description: v.data.description,
        category: v.data.category,
        price: v.data.price,
        unit: v.data.unit,
        stockCount: v.data.stock,
        isFeatured: v.data.isFeatured,
        isActive: v.data.isActive,
        supplier: v.data.supplier,
        rating: existingProduct.rating,
        images: existingProduct.images,
      },
      { returnDocument: 'after', runValidators: true },
    );
    return NextResponse.json(updatedProduct);
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

    return NextResponse.json(product, { status: 201 });
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
