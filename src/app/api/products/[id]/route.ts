import { NextResponse, type NextRequest } from 'next/server';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import Review from '@/models/Review';
import { getSessionUser } from '@/utils/getSessionUser';
import { parseProductFormData } from '@/utils/parseProductFormData';
import { requireAdmin } from '@/utils/requireAdmin';

// Next 15+ params are async — must be awaited inside the handler.
type RouteContext = { params: Promise<{ id: string }> };

// GET /api/products/:id — product detail with attached reviews.
export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) return new Response('Product Not Found', { status: 404 });

    const reviews = await Review.find({ product: id });

    return NextResponse.json({ ...product.toJSON(), reviews });
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// DELETE /api/products/:id — admin-only.
export const DELETE = async (
  _request: NextRequest,
  { params }: RouteContext,
) => {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return new Response('Product not found', { status: 404 });
    }

    await Product.findByIdAndDelete(id);
    return new Response('Product deleted successfully', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Failed to delete product', { status: 500 });
  }
};

// PUT /api/products/:id — admin-only update from the dashboard form.
export const PUT = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const formData = await request.formData();

    const existingProduct = await Product.findById(id).lean();
    if (!existingProduct) {
      return new Response('Product Does Not Exist', { status: 404 });
    }

    // rating/images/isFeatured preserved from existing doc — not editable via
    // the admin form (rating is review-derived; images via separate upload).
    const productData = {
      ...parseProductFormData(formData),
      rating: existingProduct.rating,
      images: existingProduct.images,
      isFeatured: existingProduct.isFeatured,
    };

    const updatedProduct = await Product.findByIdAndUpdate(id, productData);
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error(error);
    return new Response('Failed To Update Product', { status: 500 });
  }
};

// POST /api/products/:id — submit a review. Folds the new rating into the
// product's running average (well, two-point mean) and persists the review.
export const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response('User ID is required', { status: 401 });
    }
    const { userId } = sessionUser;
    const { id } = await params;

    const { rating, comment } = (await request.json()) as {
      rating?: number | string;
      comment?: string;
    };

    if (!rating || !comment) {
      return new Response('Rating and comment are required', { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return new Response('Product not found', { status: 404 });
    }

    const parsedRating = Number.parseFloat(String(rating));
    if (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      return new Response('Invalid rating value', { status: 400 });
    }

    const newRating = product.rating
      ? Math.floor(((product.rating + parsedRating) / 2) * 100) / 100
      : parsedRating;

    product.rating = newRating;
    await product.save();

    const review = new Review({
      user: userId,
      product: id,
      rating: parsedRating,
      comment,
    });
    await review.save();

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response('Failed to create review', { status: 500 });
  }
};
