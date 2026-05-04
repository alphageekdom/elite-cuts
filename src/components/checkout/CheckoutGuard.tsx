'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';

// import { useGlobalContext } from '@/context/CartContext';

// Redirects to /cart if the cart is empty after the client has finished
// hydrating. Commented out for development — re-enable before shipping.
const CheckoutGuard = ({ children }: { children: React.ReactNode }) => {
  // const { cartItems, loading } = useGlobalContext();
  // const router = useRouter();

  // useEffect(() => {
  //   if (!loading && cartItems.length === 0) {
  //     router.replace('/cart');
  //   }
  // }, [cartItems.length, loading, router]);

  // if (!loading && cartItems.length === 0) return null;

  return <>{children}</>;
};

export default CheckoutGuard;
