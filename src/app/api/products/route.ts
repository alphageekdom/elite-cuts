import { NextResponse, type NextRequest } from 'next/server';
import type { SortOrder } from 'mongoose';

import cloudinary from '@/config/cloudinary';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import { parseProductFormData } from '@/utils/parseProductFormData';
import { requireAdmin } from '@/utils/requireAdmin';
import { parsePagination } from '@/lib/api-handler';

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
    const [total, products] = await Promise.all([
      Product.countDocuments(activeFilter),
      Product.find(activeFilter).sort(sort).skip(skip).limit(pageSize),
    ]);

    return NextResponse.json({ total, products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/products — admin-only product create. Form-encoded so the admin
// dashboard can include image files; uploads go to Cloudinary first, then
// the Mongo doc references the secure URLs.
export const POST = async (request: NextRequest) => {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const formData = await request.formData();

    // FormData entries are `string | File`; narrow to File and skip the
    // empty-name placeholder browsers send for un-touched file inputs.
    const images = formData
      .getAll('images')
      .filter((image): image is File => image instanceof File && image.name !== '');

    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const imageBuffer = await image.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');

        const result = await cloudinary.uploader.upload(
          `data:image/png;base64,${imageBase64}`,
          { folder: 'elitecuts' },
        );

        return result.secure_url;
      }),
    );

    // rating defaults to 0 via schema; admin form doesn't collect it.
    const productData = {
      ...parseProductFormData(formData),
      images: uploadedImages,
    };

    const newProduct = new Product(productData);
    await newProduct.save();

    return NextResponse.json(
      { id: String(newProduct._id) },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to add product' }, { status: 500 });
  }
};
