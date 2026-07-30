import 'server-only';

import { cache } from 'react';

import connectDB from '@/config/database';
import ProductModel from '@/models/Product';
import { PUBLIC_PRODUCT_PROJECTION } from '@/lib/products/public-projection';

// Legacy product URLs were keyed by ObjectId; the nightly demo reset rotates
// those ids, so slug is the canonical key now. A 24-hex param that still
// resolves against an id redirects to its slug URL.
const OBJECT_ID_RE = /^[a-f0-9]{24}$/;

type ResolvedProduct =
  | { kind: 'found'; doc: Record<string, unknown> }
  | { kind: 'redirect'; slug: string }
  | { kind: 'notfound' };

// React.cache dedupes within a single request: generateMetadata and the page
// component both resolve the same param, so the slug lookup (and the rare
// legacy-id fallback) run once per render instead of twice each — the same
// dedup convention getShopSettings/getActiveAnnouncements already use.
export const resolveProductByParam = cache(
  async (param: string): Promise<ResolvedProduct> => {
    await connectDB();

    const doc = await ProductModel.findOne(
      { slug: param },
      PUBLIC_PRODUCT_PROJECTION,
    ).lean();
    if (doc) return { kind: 'found', doc: doc as Record<string, unknown> };

    if (OBJECT_ID_RE.test(param)) {
      const legacy = await ProductModel.findById(param).select('slug').lean();
      if (legacy?.slug) return { kind: 'redirect', slug: legacy.slug };
    }

    return { kind: 'notfound' };
  },
);
