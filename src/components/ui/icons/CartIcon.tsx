import { FiShoppingCart } from 'react-icons/fi';

type CartIconProps = {
  className?: string;
  // The cart page's empty state draws it lighter, at 1.6.
  strokeWidth?: number;
};

// Feather, via react-icons — the same paths this file used to inline by hand.
const CartIcon = ({ className, strokeWidth = 2 }: CartIconProps) => (
  <FiShoppingCart
    className={className}
    strokeWidth={strokeWidth}
    aria-hidden='true'
  />
);

export default CartIcon;
