import { useState } from 'react';
import { toast } from 'sonner';

import { useCartContext, type AddItemArg } from '@/context/CartContext';

const useHandleAddToCart = (product: AddItemArg) => {
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
      await addItemToCart(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update server: ${message}`);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return { isAddingToCart, handleAddToCart };
};

export default useHandleAddToCart;
