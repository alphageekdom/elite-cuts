'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
  calculateSubtotal,
  calculateTaxesTotal,
  calculateGrandTotal,
} from '@/utils/cart';
import { useGlobalContext } from '@/context/CartContext';
import CartCard from './CartCard';

const TAX_RATE = 0.1;

const CartSummary = () => {
  const router = useRouter();
  const { cartItems, loading, removeItemFromCart, setItemQuantity } =
    useGlobalContext();

  const totals = useMemo(() => {
    const subtotal = calculateSubtotal(cartItems);
    const taxesTotal = calculateTaxesTotal(subtotal, TAX_RATE);
    const grandTotal = calculateGrandTotal(subtotal, taxesTotal);
    return { subtotal, taxesTotal, grandTotal };
  }, [cartItems]);

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

  const closeModal = () => {
    document.body.style.overflow = '';
    router.push('/');
  };

  return (
    <CartCard
      cartItems={cartItems}
      loading={loading}
      handleRemoveItem={handleRemoveItem}
      handleQuantityChange={handleQuantityChange}
      subtotal={totals.subtotal}
      taxesTotal={totals.taxesTotal}
      grandTotal={totals.grandTotal}
      onClose={closeModal}
    />
  );
};

export default CartSummary;
