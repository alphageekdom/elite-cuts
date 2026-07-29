import { NextResponse, type NextRequest } from 'next/server';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { VISIBLE_PRODUCT_FILTER } from '@/lib/products/constants';
import { RECENTLY_VIEWED_LIMIT } from '@/lib/products/recently-viewed';
import type { SerializedProduct } from '@/models/Product';

// GET /api/products/by-slug?slugs=dry-aged-ribeye,pork-belly
//
// Hydrates the profile's recently-viewed list. The browser holds slugs; this
// returns the live product for each one, in the order asked for.
//
// Resolving against the catalog on every read (rather than storing a snapshot
// in the browser) is what keeps the panel honest: a cut the shop has since
// withdrawn, deactivated, or lost its photography simply falls out of the
// response instead of being offered back at a price that may have moved.
//
// Public and read-only — this is the same data the catalog page already shows
// anyone, so there is nothing here to gate behind a session.
export const GET = async (request: NextRequest) => {
  try {
    const raw = request.nextUrl.searchParams.get('slugs') ?? '';
    const slugs = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, RECENTLY_VIEWED_LIMIT);

    if (slugs.length === 0) return NextResponse.json({ items: [] });

    await connectDB();
    const docs = await Product.find({
      ...VISIBLE_PRODUCT_FILTER,
      slug: { $in: slugs },
    }).lean();

    const bySlug = new Map(
      docs.map((doc) => {
        const product = convertToSerializableObject(
          doc as unknown as Record<string, unknown>,
        ) as SerializedProduct;
        return [product.slug, product];
      }),
    );

    // Caller's order is the meaningful one (newest viewed first); Mongo's is not.
    const items = slugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is SerializedProduct => Boolean(p));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[products/by-slug GET]', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 },
    );
  }
};
