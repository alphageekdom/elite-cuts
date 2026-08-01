'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCartContext, type AddItemArg } from '@/context/CartContext';

export const useHandleAddToCart = (
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
      // No catch: `addItemToCart` handles and toasts its own failures and
      // always resolves. A catch here was unreachable, and would have
      // double-toasted the moment it stopped being. `clearCart` is the
      // deliberate exception in that API — it resolves a boolean because the
      // expiry timer has to know whether the clear actually landed.
      await addItemToCart(product, opts);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return { isAddingToCart, handleAddToCart };
};
