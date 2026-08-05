import { FiClock } from 'react-icons/fi';

type ClockIconProps = {
  className?: string;
  // The customer-detail hero draws it at 2.5.
  strokeWidth?: number;
};

// Feather, via react-icons — the same paths this file used to inline by hand.
const ClockIcon = ({ className, strokeWidth = 2 }: ClockIconProps) => (
  <FiClock className={className} strokeWidth={strokeWidth} aria-hidden='true' />
);

export default ClockIcon;
