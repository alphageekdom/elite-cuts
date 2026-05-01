'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';

const CartContext = createContext();

export function CartProvider({
  children,
  initialCartCount = 0,
  initialCartItems = [],
}) {
  const { data: session } = useSession();
  const isLoggedIn = session && session.user;

  const [cartCount, setCartCount] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedCartCount = localStorage.getItem('cartCount');
      return storedCartCount ? parseInt(storedCartCount, 10) : initialCartCount;
    }
    return initialCartCount;
  });

  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedCartItems = localStorage.getItem('cartItems');
      return storedCartItems ? JSON.parse(storedCartItems) : initialCartItems;
    }
    return initialCartItems;
  });

  // const [cartUpdateTrigger, setCartUpdateTrigger] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      localStorage.setItem('cartCount', cartCount.toString());
    }
  }, [cartItems, cartCount]);

  useEffect(() => {
    const fetchCartData = async () => {
      if (!isLoggedIn) return;

      try {
        const res = await fetch('/api/cart', { credentials: 'include' });
        if (!res.ok) {
          throw new Error('Failed to fetch cart data');
        }
        const data = await res.json();
        setCartItems(data.items);
        setCartCount(data.items.length);
      } catch (error) {
        console.error('Error fetching cart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartData();
  }, []);

  const addItemToCart = async (item) => {
    try {
      const productToAdd = {
        productId: item._id,
        quantity: item.quantity || 1,
      };

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productToAdd),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add item to cart');
      }

      const updatedCartItems = [...cartItems, item];
      setCartItems(updatedCartItems);
      setCartCount(updatedCartItems.length);

      toast.success('Item added to cart');
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const removeItemFromCart = async (itemId) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to remove item from cart');
      }

      const updatedCartItems = cartItems.filter((item) => item._id !== itemId);
      setCartItems(updatedCartItems);
      setCartCount(updatedCartItems.length);

      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing item from cart:', error);
      toast.error('Failed to remove item from cart');
    }
  };

  const contextValue = {
    cartCount,
    cartItems,
    // cartUpdateTrigger,
    loading,
    setCartCount,
    setCartItems,
    addItemToCart,
    removeItemFromCart,
    setLoading,
  };

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(CartContext);
}

export default CartContext;
