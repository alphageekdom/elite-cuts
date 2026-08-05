import { FiCheck } from 'react-icons/fi';

type CheckIconProps = { className?: string; strokeWidth?: number };

// Feather, via react-icons — the same paths this file used to inline by hand.
const CheckIcon = ({ className, strokeWidth = 2.5 }: CheckIconProps) => (
  <FiCheck className={className} strokeWidth={strokeWidth} aria-hidden='true' />
);

export default CheckIcon;
