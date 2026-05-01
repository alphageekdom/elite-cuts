'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculateSubtotal,
  calculateTaxesTotal,
  calculateGrandTotal,
} from '@/utils/cart';

const MobileCartSummary = ({ cartItems, isInModal, onClose }) => {
  const [subtotal, setSubtotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0.1);
  const [taxesTotal, setTaxesTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const router = useRouter();

  const redirectToCart = () => {
    router.push('/cart');
    if (isInModal) {
      onClose();
    }
  };

  const redirectToCheckout = () => {
    router.push('/checkout');
    if (isInModal) {
      onClose();
    }
  };
  useEffect(() => {
    const subtotal = calculateSubtotal(cartItems);
    const taxesTotal = calculateTaxesTotal(subtotal, taxRate);
    const grandTotal = calculateGrandTotal(subtotal, taxesTotal);
    setSubtotal(subtotal);
    setTaxesTotal(taxesTotal);
    setGrandTotal(grandTotal);
  }, [cartItems, taxRate]);

  return (
    <div className='bg-white p-4 rounded-lg text-right lg:text-left overflow-y-auto'>
      <div className='flex justify-between'>
        <h2 className='text-xl font-semibold'>Subtotal:</h2>
        <p className='text-gray-600'>${subtotal.toFixed(2)}</p>
      </div>
      <div className='flex justify-between'>
        <h2 className='text-xl font-semibold'>Taxes:</h2>
        <p className='text-gray-600'>${taxesTotal.toFixed(2)}</p>
      </div>
      <div className='flex justify-between'>
        <h2 className='text-xl font-semibold'>Grand Total</h2>
        <p className='text-gray-600'>${grandTotal.toFixed(2)}</p>
      </div>
      <button
        type='button'
        className={`w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
          subtotal === 0 && taxesTotal === 0 && grandTotal === 0
            ? 'bg-gray-300 cursor-not-allowed pointer-events-none'
            : 'hover:bg-gray-500'
        }`}
        disabled={subtotal === 0 && taxesTotal === 0 && grandTotal === 0}
        onClick={redirectToCheckout}
      >
        Go To Checkout
      </button>
      {isInModal && (
        <button
          type='button'
          className='w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-gray-500 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          onClick={redirectToCart}
        >
          Go To Cart
        </button>
      )}
    </div>
  );
};

export default MobileCartSummary;
