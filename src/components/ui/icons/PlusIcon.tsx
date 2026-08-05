import { FiPlus } from 'react-icons/fi';

type PlusIconProps = {
  className?: string;
  // The admin page-header "add" buttons and the quantity steppers draw at 2.
  strokeWidth?: number;
};

// Feather, via react-icons — the same paths this file used to inline by hand.
const PlusIcon = ({ className, strokeWidth = 2.5 }: PlusIconProps) => (
  <FiPlus className={className} strokeWidth={strokeWidth} aria-hidden='true' />
);

export default PlusIcon;
