import { FiMinus } from 'react-icons/fi';

type MinusIconProps = {
  className?: string;
  // Pairs with PlusIcon on the quantity steppers, which draw both at 2.
  strokeWidth?: number;
};

// Feather, via react-icons — the same paths this file used to inline by hand.
const MinusIcon = ({ className, strokeWidth = 2.5 }: MinusIconProps) => (
  <FiMinus className={className} strokeWidth={strokeWidth} aria-hidden='true' />
);

export default MinusIcon;
