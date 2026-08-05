import { FiX } from 'react-icons/fi';

type XIconProps = {
  className?: string;
  // Not every call site wants the heavier default — the store-info modal's
  // close control is drawn at 2.
  strokeWidth?: number;
};

// Feather, via react-icons — the same paths this file used to inline by hand.
const XIcon = ({ className, strokeWidth = 2.5 }: XIconProps) => (
  <FiX className={className} strokeWidth={strokeWidth} aria-hidden='true' />
);

export default XIcon;
