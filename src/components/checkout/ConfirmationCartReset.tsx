'use client';

import { useEffect } from 'react';
import { useCartContext } from '@/context/CartContext';

// Runs once when the confirmation page mounts to drop any local cart state
// that survived the POST → redirect handoff. The server cart was already
// emptied by the order route; this just resyncs the client. We do it here
// rather than in PlaceOrderButton because CheckoutGuard on the previous page
// watches cartItems.length and would bounce the user to /cart mid-navigation.
const ConfirmationCartReset = () => {
  const { resetCartLocal } = useCartContext();
  useEffect(() => {
    resetCartLocal();
  }, [resetCartLocal]);
  return null;
};

export default ConfirmationCartReset;
