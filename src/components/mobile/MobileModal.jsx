'use client';

import { useEffect, useMemo } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { FaShoppingCart } from 'react-icons/fa';

import {
  calculateSubtotal,
  calculateTaxesTotal,
  calculateGrandTotal,
} from '@/utils/cart';
import { useGlobalContext } from '@/context/CartContext';
import MobileCart from './MobileCart';

const TAX_RATE = 0.1;

const MobileModal = ({ isOpen, onClose }) => {
  const { cartItems, removeItemFromCart, setItemQuantity } = useGlobalContext();

  // useMemo so totals update synchronously with cartItems changes — there's
  // no async boundary that needed the old useState/useEffect pair.
  const { subtotal, taxesTotal, grandTotal } = useMemo(() => {
    const sub = calculateSubtotal(cartItems);
    const tax = calculateTaxesTotal(sub, TAX_RATE);
    return {
      subtotal: sub,
      taxesTotal: tax,
      grandTotal: calculateGrandTotal(sub, tax),
    };
  }, [cartItems]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const closeModal = () => {
    onClose();
    document.body.style.overflow = '';
  };

  const handleRemoveItem = async (productId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this item?'
    );
    if (!confirmed) return;
    await removeItemFromCart(productId);
  };

  const handleQuantityChange = async (productId, change) => {
    const line = cartItems.find((item) => item.product?._id === productId);
    if (!line) return;
    const next = line.quantity + change;
    if (next <= 0) {
      await handleRemoveItem(productId);
      return;
    }
    await setItemQuantity(productId, next);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed top-0 left-0 w-screen h-full bg-gray-800 bg-opacity-75 flex justify-center items-center z-30 '>
      <div className='bg-white text-black p-8 rounded-lg relative w-[90%] md:[50%] h-full overflow-hidden'>
        <button
          className='absolute top-2 right-2 text-gray-600 hover:text-gray-800'
          onClick={closeModal}
        >
          <AiOutlineClose className='h-6 w-6' />
        </button>
        <div className='flex justify-center  h-full'>
          <div className='w-full h-full'>
            <div className='flex flex-row justify-start items-center p-5 gap-3 text-gray-600'>
              <FaShoppingCart className='text-2xl' />
              <h1 className='text-2xl'>
                Cart
                <span className='text-grey-300 ml-2'>
                  ({cartItems.length} Items)
                </span>
              </h1>
            </div>
            <MobileCart
              cartItems={cartItems}
              handleRemoveItem={handleRemoveItem}
              handleQuantityChange={handleQuantityChange}
              isInModal={true}
              onClose={closeModal}
              subtotal={subtotal}
              taxesTotal={taxesTotal}
              grandTotal={grandTotal}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileModal;
