'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';

const ProductSearchForm = () => {
  const [product, setProduct] = useState('');
  const [productType, setProductType] = useState('All');

  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();

    const sanitizedProduct = DOMPurify.sanitize(product.trim());

    if (sanitizedProduct === '' && productType === 'All') {
      router.push('/products');
    } else {
      const query = `?product=${product}&productType=${productType}`;

      router.push(`/products/search-results${query}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='mt-3 mx-auto max-w-2xl w-full flex flex-col md:flex-row items-center'
    >
      <div className='w-full md:w-3/5 md:pr-2 mb-4 md:mb-0'>
        <label htmlFor='product' className='sr-only'>
          Product
        </label>
        <input
          type='text'
          id='product'
          placeholder='Enter Keywords, Product or Cut'
          className='w-full px-4 py-3 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring focus:ring-blue-500'
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
      </div>
      <div className='w-full md:w-2/5 md:pl-2'>
        <label htmlFor='product-type' className='sr-only'>
          Product Category
        </label>
        <select
          id='product-type'
          className='w-full px-4 py-3 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring focus:ring-blue-500'
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
        >
          <option value='All'>All</option>
          <option value='Beef'>Beef</option>
          <option value='Pork'>Pork</option>
          <option value='Poultry'>Poultry</option>
          <option value='Other'>Other</option>
        </select>
      </div>
      <button
        type='submit'
        className='md:ml-4 mt-4 md:mt-0 w-full md:w-auto px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-700 focus:outline-none focus:ring focus:ring-blue-500'
      >
        Search
      </button>
    </form>
  );
};

export default ProductSearchForm;
