import Products from '@/components/product/Products';
import ProductSearchForm from '@/components/uielements/ProductSearchForm';

const ProductsPage = async () => {
  return (
    <>
      <section className='bg-[#B91C1B] py-4 search-form'>
        <div className='max-w-7xl mx-auto px-4 flex flex-col items-start sm:px-6 lg:px-8'>
          <ProductSearchForm />
        </div>
      </section>
      <section className='py-4'>
        <div className='max-w-7xl mx-auto px-4 flex flex-col items-start sm:px-6 lg:px-8'></div>
      </section>

      <Products />
    </>
  );
};

export default ProductsPage;
