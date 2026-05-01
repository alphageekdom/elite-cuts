'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import Spinner from '@/components/Spinner';
import Pagination from '@/components/uielements/Pagination';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProducts = async () => {
    try {
      const res = await fetch(
        `/api/products?page=${page}&pageSize=${pageSize}`
      );

      if (!res.ok) {
        throw new Error('Failed To Fetch Data');
      }

      const data = await res.json();

      setProducts(data.products);
      setTotalItems(data.total);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, pageSize]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (loading) return <Spinner />;

  return (
    <section className='px-4 py-6'>
      <div className='container-xl lg:container m-auto px-4 py-6'>
        {products.length === 0 ? (
          <p>No Cuts Found</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10'>
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>
    </section>
  );
};

export default Products;
