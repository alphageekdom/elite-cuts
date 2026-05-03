import { NextResponse, type NextRequest } from 'next/server';
import type { SortOrder } from 'mongoose';

import cloudinary from '@/config/cloudinary';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import { parseProductFormData } from '@/utils/parseProductFormData';
import { requireAdmin } from '@/utils/requireAdmin';

// GET /api/products — list products with pagination + arbitrary sort field.
// Preserved for future mobile / CLI clients; the catalog page queries the
// model directly.
export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
    const pageSize = Math.max(
      1,
      Number.parseInt(params.get('pageSize') ?? '6', 10) || 6,
    );

    const sortField = params.get('sortField') ?? '_id';
    const sortOrder: SortOrder = params.get('sortOrder') === 'desc' ? -1 : 1;
    const sort: Record<string, SortOrder> = { [sortField]: sortOrder };

    const skip = (page - 1) * pageSize;

    const [total, products] = await Promise.all([
      Product.countDocuments({}),
      Product.find({}).sort(sort).skip(skip).limit(pageSize),
    ]);

    return NextResponse.json({ total, products });
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
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

    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/products/${newProduct._id}`,
    );
  } catch (error) {
    console.error(error);
    return new Response('Failed to add product', { status: 500 });
  }
};
