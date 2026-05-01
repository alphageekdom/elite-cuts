import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGlobalContext } from '@/context/CartContext';

const useHandleAddToCart = (product) => {
  const { addItemToCart } = useGlobalContext();

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
      console.error('Error updating server:', error);
      toast.error(`Failed to update server: ${error.message}`);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return { isAddingToCart, handleAddToCart };
};

export default useHandleAddToCart;
