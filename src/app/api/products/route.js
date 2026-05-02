import connectDB from '@/config/database';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';
import cloudinary from '@/config/cloudinary';

// GET /api/products
export const GET = async (request) => {
  try {
    await connectDB();

    const page = request.nextUrl.searchParams.get('page') || 1;
    const pageSize = request.nextUrl.searchParams.get('pageSize') || 6;

    const sortField = request.nextUrl.searchParams.get('sortField') || '_id';
    const sortOrder = request.nextUrl.searchParams.get('sortOrder') || 'asc';

    const skip = (page - 1) * pageSize;

    const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const [total, products] = await Promise.all([
      Product.countDocuments({}),
      Product.find({})
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .select('-largeField'),
    ]);

    const result = {
      total,
      products,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// POST /api/products
export const POST = async (request) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response('User ID is required', { status: 401 });
    }

    if (!sessionUser.user?.isAdmin) {
      return new Response('Admin access required', { status: 403 });
    }

    const formData = await request.formData();

    const images = formData
      .getAll('images')
      .filter((image) => image.name !== '');

    // Upload images to Cloudinary
    const imageUploadPromises = images.map(async (image) => {
      const imageBuffer = await image.arrayBuffer();
      const imageArray = Array.from(new Uint8Array(imageBuffer));
      const imageData = Buffer.from(imageArray);

      // Convert image data to base64
      const imageBase64 = imageData.toString('base64');

      // Upload image to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:image/png;base64,${imageBase64}`,
        {
          folder: 'elitecuts',
        }
      );

      return result.secure_url;
    });

    const uploadedImages = await Promise.all(imageUploadPromises);

    // rating defaults to 0 via schema; admin form doesn't collect it.
    const productData = {
      name: formData.get('name'),
      category: formData.get('category'),
      description: formData.get('description'),
      price: formData.get('price'),
      stockCount: formData.get('stockCount'),
      images: uploadedImages,
    };

    const newProduct = new Product(productData);
    await newProduct.save();

    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/products/${newProduct._id}`
    );

    // return new Response(JSON.stringify({ message: 'Success' }), {
    //   status: 200,
    // });
  } catch (error) {
    console.log(error);
    return new Response('Failed to add product', { status: 500 });
  }
};
