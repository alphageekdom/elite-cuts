'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCartContext } from '@/context/CartContext';
import CartCount from './CartCount';
import CartDrawer from './CartDrawer';

type CartButtonProps = {
  scrolled?: boolean;
};

const CartButton = ({ scrolled = false }: CartButtonProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { cartCount, loading } = useCartContext();
  const router = useRouter();

  // Empty cart → /cart so guests can see the page chrome.
  // Otherwise: drawer everywhere except phone landscape, where items + footer
  // can't fit comfortably under ~310px of usable body height. We gate on
  // (pointer: coarse) so a desktop browser with a short window keeps the
  // drawer — only touch devices in short orientation route to /cart.
  const handleCartClick = () => {
    if (loading) return;
    if (cartCount === 0) {
      router.push('/cart');
      return;
    }
    const isPhoneLandscape =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse) and (max-height: 500px)').matches;
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
