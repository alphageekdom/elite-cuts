import { FiMapPin } from 'react-icons/fi';

type PinIconProps = { className?: string };

// Feather, via react-icons — the same paths this file used to inline by hand.
const PinIcon = ({ className }: PinIconProps) => (
  <FiMapPin className={className} strokeWidth={2} aria-hidden='true' />
);

export default PinIcon;
