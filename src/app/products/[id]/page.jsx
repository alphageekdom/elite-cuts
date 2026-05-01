import ProductDetails from '@/components/product/ProductDetails';
import BackButton from '@/components/uielements/BackButton';
import ProductSearchForm from '@/components/uielements/ProductSearchForm';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import { convertToSerializeableObject } from '@/utils/convertToObject';

const ProductPage = async ({ params }) => {
  const PUBLIC_DOMAIN = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  await connectDB();

  const productDoc = await Product.findById(params.id).lean();

  const product = convertToSerializeableObject(productDoc);

  if (!product) {
    return (
      <h1 className='text-center text-2xl font-bold mt-10'>
        Product Not Found
      </h1>
    );
  }

  return (
    <>
      <section className='bg-[#B91C1B] py-4 search-form'>
        <div className='max-w-7xl mx-auto px-4 flex flex-col items-start sm:px-6 lg:px-8'>
          <ProductSearchForm />
        </div>
      </section>

      <BackButton href={'/products'} />

      <section className='bg-blue-50'>
        <div className='container m-auto py-10 px-6'>
          <div className='grid grid-cols-1 md:grid-cols-70/30 w-full gap-6'>
            <ProductDetails product={product} />
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductPage;
