'use client';

import { FaShoppingCart } from 'react-icons/fa';

import BackButton from '@/components/uielements/BackButton';
import CartSummary from '@/components/cart/CartSummary';
import { useGlobalContext } from '@/context/CartContext';

const CartPage = () => {
  const { cartCount } = useGlobalContext();

  return (
    <>
      <BackButton href={'/products'} />
      <section className='bg-blue-50'>
        <div className='container m-auto py-10 px-6'>
          <div className='flex flex-row justify-start items-center p-5 gap-3 text-gray-600'>
            <FaShoppingCart className='text-5xl' />
            <h1 className='text-5xl font-bold'>
              Cart
              <span className='text-grey-300 ml-2'>({cartCount} Items)</span>
            </h1>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-70/30 w-full gap-6 mt-9'>
            <CartSummary />
          </div>
        </div>
      </section>
    </>
  );
};

export default CartPage;
