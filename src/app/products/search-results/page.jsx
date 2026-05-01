import ProductCard from '@/components/product/ProductCard';
import ProductSearchForm from '@/components/uielements/ProductSearchForm';
import BackButton from '@/components/uielements/BackButton';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import { convertToSerializeableObject } from '@/utils/convertToObject';

const SearchResultsPage = async ({
  searchParams: { product, productType },
}) => {
  await connectDB();

  const productPattern = new RegExp(product, 'i');

  let query = {
    $or: [{ name: productPattern }, { description: productPattern }],
  };

  if (productType && productType !== 'All') {
    const typePattern = new RegExp(productType, 'i');
    query.type = typePattern;
  }

  const productsQueryResults = await Product.find(query).lean();
  const products = convertToSerializeableObject(productsQueryResults);

  return (
    <>
      <section className='bg-[#B91C1B] py-4'>
        <div className='max-w-7xl mx-auto px-4 flex flex-col items-start sm:px-6 lg:px-8'>
          <ProductSearchForm />
        </div>
      </section>
      <section className='px-4 py-6'>
        <div className='container-xl lg:container m-auto px-4 py-6'>
          <BackButton href={'/products'} />
          <h1 className='text-2xl mb-4'>Search Results</h1>
          {products.length === 0 ? (
            <p>No Search Results Found</p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default SearchResultsPage;
