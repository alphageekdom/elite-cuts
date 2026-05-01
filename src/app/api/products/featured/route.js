import connectDB from '@/config/database';
import Product from '@/models/Product';

await connectDB();

// GET /api/products/featured
export const GET = async (request) => {
  try {
    const products = await Product.find({
      isFeatured: true,
    });

    return new Response(JSON.stringify(products), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something Went Wrong', {
      status: 500,
    });
  }
};
