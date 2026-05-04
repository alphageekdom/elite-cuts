'use client';

import { FaStar, FaDollarSign } from 'react-icons/fa';
import { GiMeatCleaver } from 'react-icons/gi';
import dynamic from 'next/dynamic';
import ProductImages from './ProductImages';
import BookmarkButton from '@/components/uielements/BookmarkButton';
import ShareButtons from '../uielements/ShareButton';
import React, { useState, Suspense } from 'react';
import { toast } from 'react-toastify';
import { useGlobalContext } from '@/context/CartContext';
import { useSession } from 'next-auth/react';

const CommentSection = dynamic(() => import('./CommentSection'), {
  suspense: true,
});

const ProductDetails = React.memo(({ product }) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addItemToCart } = useGlobalContext();

  const { data: session } = useSession();
  const isLoggedIn = session && session.user;

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast.error('You must be logged in to add items to the cart');
      return;
    }

    if (isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: product?._id }),
      });
      if (res.ok) {
        toast.success('Added To Cart');
        addItemToCart(product);
      } else {
        console.error('Failed to add item to cart');
        toast.error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Error adding to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };
  return (
    <main className='container mx-auto px-4'>
      <div className='rounded-lg bg-white p-6 text-center md:text-left'>
        <div className='mb-4 text-left text-gray-500'>{product.category}</div>
        <div className='mb-4 flex items-center justify-between text-3xl font-bold'>
          {product.name}
          <span className='ml-2 flex'>
            <FaStar className='text-yellow-500' />
            {product.rating}
          </span>
        </div>
        <div className='mb-4 flex flex-col md:flex-row'>
          <div className='md:w-1/2'>
            <div className='mt-6 rounded-lg bg-white p-6'>
              <h3 className='mb-2 flex items-center text-lg font-bold'>
                <GiMeatCleaver className='mr-2 text-2xl' />
                {product.name}
              </h3>
              <p className='mb-4 text-left text-gray-500'>
                {product.description}
              </p>
              <div className='mb-4 flex items-center justify-between gap-4 text-xl'>
                <p className='flex items-center text-left'>
                  <FaDollarSign className='text-1xl mr-2' />
                  {product.price} / lbs
                </p>
                <button
                  className='rounded bg-red-800 px-4 py-2 font-bold text-white hover:bg-red-700'
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
              <p className='mb-9 text-xl font-semibold text-red-900'>
                Current Stock: {product.stockCount}
              </p>
              <div className='my-4 border-t border-gray-500'></div>
              <BookmarkButton product={product} />
              <ShareButtons product={product} />
            </div>
          </div>
          <div className='mt-4 md:mt-0 md:w-1/2 md:pl-4'>
            <ProductImages images={product.images} />
          </div>
        </div>
      </div>

      <div className='mt-6 rounded-lg bg-white p-6'>
        <Suspense fallback={<div>Loading...</div>}>
          <CommentSection product={product} />
        </Suspense>
      </div>
    </main>
  );
});

export default ProductDetails;
