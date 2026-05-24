import { NextResponse, type NextRequest } from 'next/server';
import type { SortOrder } from 'mongoose';

import cloudinary from '@/config/cloudinary';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import { validateProductImages } from '@/lib/products/image-validate';
import {
  coerceProductInput,
  productRecordFromFormData,
} from '@/lib/products/parse-form-input';
import { productInputSchema } from '@/lib/products/schema';
import { withAdminNonDemo, parsePagination } from '@/lib/api-handler';

const ALLOWED_PRODUCT_SORT_FIELDS = new Set(['_id', 'name', 'price', 'createdAt', 'stockCount']);

// GET /api/products — list products with pagination + arbitrary sort field.
// Preserved for future mobile / CLI clients; the catalog page queries the
// model directly.
export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const { skip, pageSize } = parsePagination(params, { pageSize: 6 });
    const rawSortField = params.get('sortField') ?? '_id';
    const sortField = ALLOWED_PRODUCT_SORT_FIELDS.has(rawSortField) ? rawSortField : '_id';
    const sortOrder: SortOrder = params.get('sortOrder') === 'desc' ? -1 : 1;
    const sort: Record<string, SortOrder> = { [sortField]: sortOrder };

    const activeFilter = { isActive: { $ne: false } };
    const [total, items] = await Promise.all([
      Product.countDocuments(activeFilter),
      Product.find(activeFilter).sort(sort).skip(skip).limit(pageSize),
    ]);

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('[products GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/products — admin-only product create. Form-encoded so the admin
// dashboard can include image files; uploads go to Cloudinary first, then
// the Mongo doc references the secure URLs. Validation runs through the
// Zod schema at src/lib/products/schema.ts (same schema the admin form
// uses pre-submit for inline errors).
export const POST = withAdminNonDemo(async (request: NextRequest) => {
  try {
    const formData = await request.formData();

    const parsed = productInputSchema.safeParse(
      coerceProductInput(productRecordFromFormData(formData)),
    );
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({ message: first?.message ?? 'Invalid input' }, { status: 400 });
    }

    // FormData entries are `string | File`; narrow to File and skip the
    // empty-name placeholder browsers send for un-touched file inputs.
    const images = formData
      .getAll('images')
      .filter((image): image is File => image instanceof File && image.name !== '');

    // Reject SVG, oversized files, and unexpected MIME types before any
    // Cloudinary round-trip — Cloudinary trusts what we hand it, so this is
    // the only gate between an admin upload and our trusted image domain.
    const imagesCheck = await validateProductImages(images);
    if (!imagesCheck.ok) {
      return NextResponse.json({ message: imagesCheck.error }, { status: 400 });
    }

    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const imageBuffer = await image.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        const result = await cloudinary.uploader.upload(
          `data:${image.type};base64,${imageBase64}`,
          { folder: 'elitecuts' },
        );
        return result.secure_url;
      }),
    );

    // The model's pre-validate hook stamps backcompat `price` / `unit` and
    // the display labels from the canonical pricingType + per-type fields,
    // so the route just hands over the parsed input verbatim plus images.
    const { stock, ...rest } = parsed.data;
    const newProduct = new Product({
      ...rest,
      stockCount: stock,
      images: uploadedImages,
    });
    await newProduct.save();

    return NextResponse.json(
      { data: { id: String(newProduct._id) } },
      { status: 201 },
    );
  } catch (error) {
    console.error('[products POST]', error);
    return NextResponse.json({ message: 'Failed to add product' }, { status: 500 });
  }
});
