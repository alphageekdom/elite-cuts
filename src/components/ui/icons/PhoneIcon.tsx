import { FiPhone } from 'react-icons/fi';

type PhoneIconProps = { className?: string };

// Feather, via react-icons — the same path this file used to inline by hand.
const PhoneIcon = ({ className }: PhoneIconProps) => (
  <FiPhone className={className} strokeWidth={2} aria-hidden='true' />
);

export default PhoneIcon;
