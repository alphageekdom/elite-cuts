'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CartCount from './CartCount';
import MobileModal from '../mobile/MobileModal';
import { useGlobalContext } from '@/context/CartContext';

const CartButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setCartItems, cartCount, setCartCount, loading, setLoading } =
    useGlobalContext();
  const { data: session } = useSession();
  const isLoggedIn = session && session.user;
  const router = useRouter();

  const handleCartClick = () => {
    if (loading) return;
    if (cartCount > 0) {
      setIsModalOpen(true);
    } else {
      router.push('/cart');
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchCartData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cart');

        if (response.ok) {
          const data = await response.json();
          const cartItemsData = data.items || [];

          setCartItems(cartItemsData);
          setCartCount(cartItemsData.length);
        } else if (response.status === 401) {
          console.error('Unauthorized access to fetch cart data');
        } else {
          throw new Error('Failed to fetch cart data');
        }
      } catch (error) {
        console.error('Error fetching cart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartData();
  }, [isLoggedIn, setCartItems, setCartCount, setLoading]);

  return (
    <>
      <CartCount onClick={handleCartClick} />
      {isModalOpen && (
        <MobileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default CartButton;
