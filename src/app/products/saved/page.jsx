'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Spinner from '@/components/Spinner';
import { toast } from 'react-toastify';
import ProductCard from '@/components/product/ProductCard';

const SavedProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const productsRef = useRef(products);

  const fetchBookmarkedProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        console.error(`Error: ${res.status}`);
        toast.error('Failed to fetch bookmarks.');
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error('Error fetching bookmarks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarkedProducts();
  }, [fetchBookmarkedProducts]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const handleBookmarkChange = useCallback((productId, isBookmarked) => {
    console.log('handleBookmarkChange called');
    console.log('Product ID:', productId);
    console.log('Is Bookmarked:', isBookmarked);
    if (!isBookmarked) {
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product._id !== productId)
      );
    }
  }, []);

  return loading ? (
    <Spinner loading={loading} />
  ) : (
    <section className='px-4 py-6'>
      <div className='container-xl lg:container m-auto px-4 py-6'>
        {products.length === 0 ? (
          <p>No cuts found.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onBookmarkChange={handleBookmarkChange}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
export default SavedProductsPage;
