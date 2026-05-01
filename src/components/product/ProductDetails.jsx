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

const CommentSection = dynamic(() => import('../CommentSection'), {
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
      <div className='bg-white p-6 rounded-lg text-center md:text-left'>
        <div className='text-gray-500 mb-4 text-left'>{product.type}</div>
        <div className='text-3xl font-bold mb-4 flex justify-between items-center'>
          {product.name}
          <span className='ml-2 flex'>
            <FaStar className='text-yellow-500' />
            {product.rating}
          </span>
        </div>
        <div className='flex flex-col md:flex-row mb-4'>
          <div className='md:w-1/2'>
            <div className='bg-white p-6 rounded-lg mt-6'>
              <h3 className='flex items-center text-lg font-bold mb-2'>
                <GiMeatCleaver className='mr-2 text-2xl' />
                {product.title}
              </h3>
              <p className='text-gray-500 mb-4 text-left'>
                {product.description}
              </p>
              <div className='flex justify-between items-center gap-4 mb-4 text-xl'>
                <p className='flex items-center text-left'>
                  <FaDollarSign className='mr-2 text-1xl' />
                  {product.price} / lbs
                </p>
                <button
                  className='bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
              <p className='text-red-900 text-xl font-semibold mb-9'>
                Current Stock: {product.inStock}
              </p>
              <div className='border-t border-gray-500 my-4'></div>
              <BookmarkButton product={product} />
              <ShareButtons product={product} />
            </div>
          </div>
          <div className='md:w-1/2 md:pl-4 mt-4 md:mt-0'>
            <ProductImages images={product.images} />
          </div>
        </div>
      </div>

      <div className='bg-white p-6 rounded-lg mt-6'>
        <Suspense fallback={<div>Loading...</div>}>
          <CommentSection product={product} />
        </Suspense>
      </div>
    </main>
  );
});

export default ProductDetails;
