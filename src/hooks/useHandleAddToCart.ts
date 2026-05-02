import { useState } from 'react';
import { toast } from 'react-toastify';

import { useGlobalContext } from '@/context/CartContext';

type CartProduct = { _id: string; quantity?: number };

const useHandleAddToCart = <T extends CartProduct>(product: T) => {
  const { addItemToCart } = useGlobalContext() as {
    addItemToCart: (item: T) => Promise<void>;
  };

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
