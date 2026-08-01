import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import Review from '@/models/Review';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth/session';
import { isDemoAdmin } from '@/lib/auth/demo-permissions';
import { pinNaturalKeyForDemo } from '@/lib/demo/natural-keys';
import {
  parseObjectId,
  withAdmin,
  zodBadRequest,
  type RouteContext,
} from '@/lib/api-handler';
import { deleteCloudinaryImages } from '@/lib/products/cloudinary-cleanup';
import {
  coerceProductInput,
  productRecordFromFormData,
} from '@/lib/products/parse-form-input';
import { productInputSchema } from '@/lib/products/schema';
import { PUBLIC_PRODUCT_PROJECTION } from '@/lib/products/public-projection';
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

    // Unauthenticated route — same projection the list GET and every other
    // customer-facing read carries. Without it, asking for one product by id
    // was a way around the strip the list applies.
    const product = await Product.findById(id).select(PUBLIC_PRODUCT_PROJECTION);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Exclude helpfulVoters — the voter id list is private. Consumers only
    // ever need the count, which the client derives from the array elsewhere.
    const reviews = await Review.find({ product: id }).select('-helpfulVoters');

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
export const PATCH = withAdmin<{ id: string }>(async (request, ctx) => {
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
export const DELETE = withAdmin<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // A demo admin may delete cuts they added, but not seeded ones. This is a
    // hard delete, and the six collections that reference a product `_id`
    // (reviews above all) would be orphaned the instant it ran — the nightly
    // restore re-creates a seeded cut, but with a fresh id, so its reviews
    // and the rating computed from them would never reattach. Deleting a cut
    // the demo session created has nothing pointing at it, so it stays open.
    const sessionUser = await getSessionUser();
    if (
      isDemoAdmin(sessionUser?.user) &&
      String(existingProduct.createdBy ?? '') !== String(sessionUser?.userId)
    ) {
      return NextResponse.json(
        {
          message:
            'Demo mode: seeded cuts can’t be deleted, but you can edit them or delete cuts you add.',
        },
        { status: 403 },
      );
    }

    // Fire-and-log Cloudinary cleanup before the Mongo delete. Local seeded
    // filenames are skipped by the helper; failures are logged but never
    // thrown, so a Cloudinary outage can't block product management.
    await deleteCloudinaryImages(existingProduct.images);

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
export const PUT = withAdmin<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;
    const formData = await request.formData();

    // Hydrated, not `.lean()` — the update below goes through `.save()` so the
    // model's pre-validate hook re-stamps the derived pricing fields.
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const record = productRecordFromFormData(formData);
    // Empty slug on an edit means "keep the existing slug", not "derive a
    // new one from name" — the drawer has no slug field, so this fires on
    // EVERY edit and is what stops a rename re-deriving the URL.
    const slugFromForm = record.slug?.trim();
    if (!slugFromForm) record.slug = existingProduct.slug;

    // `slug` is the key the nightly restore matches a seeded cut on — see
    // `pinNaturalKeyForDemo` for what a rename would strand.
    const editor = await getSessionUser();
    record.slug = pinNaturalKeyForDemo(
      editor?.user,
      record.slug,
      existingProduct.slug,
    );

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

    // Persist the STORED slug verbatim, not the copy that just came back
    // through `slugify`. The two differ only for a legacy value that isn't
    // slugify-stable — `ribeye steak`, written before that normalisation
    // existed, since the model lower-cases but has no pattern validator — and
    // for those, normalising here rewrote the URL during an edit that never
    // touched it. `/products/<old-slug>` then 404s, and the only redirect that
    // exists is id→slug, so every shared or indexed link died from a price
    // change. That is the regression the durable-URL work exists to prevent.
    //
    // Guarded on `slugFromForm` rather than applied unconditionally so that a
    // future drawer growing a real slug field still works; today it is always
    // empty, which is precisely why an edit must never move the URL.
    if (!slugFromForm) update.slug = existingProduct.slug;
    if (!formData.has('isFeatured')) update.isFeatured = existingProduct.isFeatured;
    if (!formData.has('isActive'))   update.isActive   = existingProduct.isActive;

    // Assign-then-save rather than `findByIdAndUpdate`, so the model's
    // pre-validate hook re-stamps `price`, `unit` and the display labels from
    // the canonical per-pricingType fields this update carries. A query update
    // skips document middleware entirely, which left a repriced cut showing
    // its old "$24.99/lb" label on the catalog and product page while
    // add-to-cart charged off the new rate. The demo restore already chose
    // assign-then-save for this reason; the CSV importer stamps by hand
    // because bulkWrite has the same limitation.
    existingProduct.set(update);
    await existingProduct.save();
    return NextResponse.json({ data: existingProduct });
  } catch (error) {
    // `.save()` validates the whole document, not just the submitted paths the
    // previous query update checked — so a stored value that no longer passes
    // the schema (a retired enum member, say) now surfaces here on an edit that
    // never touched it. That's the client's problem to see, not a blank 500:
    // report the offending field the way the settings route already does.
    if (error instanceof mongoose.Error.ValidationError) {
      const first = Object.values(error.errors)[0];
      return NextResponse.json(
        { message: first?.message ?? 'Invalid product payload' },
        { status: 400 },
      );
    }
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

    // Whole stars only. `parseFloat` accepted 4.99, which the model's
    // min/max never rejected and the star display has no way to render.
    const parsedRating = Number.parseFloat(String(rating));
    if (
      !Number.isInteger(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
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

    // Re-read the product so the response reflects the new rating. Projected
    // like the GET above — this response goes back to the customer who just
    // submitted the review.
    const refreshed = await Product.findById(id).select(PUBLIC_PRODUCT_PROJECTION);
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
