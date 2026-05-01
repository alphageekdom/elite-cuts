import connectDB from '@/config/database';
import FeaturedProductCard from './FeaturedProductCard';
import Product from '@/models/Product';
import { convertToSerializeableObject } from '@/utils/convertToObject';

const FeaturedProducts = async () => {
  await connectDB();

  const products = await Product.find({
    isFeatured: true,
  }).lean();

  const serializableProducts = products.map(convertToSerializeableObject);

  return (
    serializableProducts.length > 0 && (
      <section className='bg-blue-50 px-4 pt-6 pb-10'>
        <div className='container-xl lg:container m-auto'>
          <h2 className='text-4xl font-bold text-black mb-6 text-center'>
            Featured Products
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 z-10'>
            {serializableProducts.map((product) => (
              <FeaturedProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      </section>
    )
  );
};

export default FeaturedProducts;
