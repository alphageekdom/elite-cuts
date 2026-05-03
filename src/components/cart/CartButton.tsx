'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CartCount from './CartCount';
import MobileModal from '../mobile/MobileModal';
import { useGlobalContext } from '@/context/CartContext';

type CartButtonProps = {
  scrolled?: boolean;
};

const CartButton = ({ scrolled = false }: CartButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { cartCount, loading } = useGlobalContext();
  const router = useRouter();

  const handleCartClick = () => {
    if (loading) return;
    if (cartCount > 0) {
      setIsModalOpen(true);
    } else {
      router.push('/cart');
    }
  };

  return (
    <>
      <CartCount onClick={handleCartClick} scrolled={scrolled} />
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
