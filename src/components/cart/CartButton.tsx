'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { useCartContext } from '@/context/CartContext';
import CartCount from './CartCount';
import CartDrawer from './CartDrawer';

type CartButtonProps = {
  scrolled?: boolean;
};

const DRAWER_EXCLUDED_PATHS = ['/cart', '/checkout'];

const CartButton = ({ scrolled = false }: CartButtonProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { cartCount, loading } = useCartContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleCartClick = () => {
    if (loading) return;
    if (cartCount === 0 || DRAWER_EXCLUDED_PATHS.includes(pathname)) {
      router.push('/cart');
      return;
    }
    const isPhoneLandscape =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-height: 500px)').matches;
    if (isPhoneLandscape) {
      router.push('/cart');
    } else {
      setDrawerOpen(true);
    }
  };

  return (
    <>
      <CartCount onClick={handleCartClick} scrolled={scrolled} />
      <CartDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default CartButton;
