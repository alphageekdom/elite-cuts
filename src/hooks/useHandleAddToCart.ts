'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCartContext, type AddItemArg } from '@/context/CartContext';

const useHandleAddToCart = (
  product: AddItemArg,
  opts?: { silent?: boolean },
) => {
  const { addItemToCart } = useCartContext();

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    if (isAddingToCart) return;

    if (!product?._id) {
      toast.error('Product not available');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItemToCart(product, opts);
    } catch {
      toast.error('Could not add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return { isAddingToCart, handleAddToCart };
};

export default useHandleAddToCart;
