import { FiHeart } from 'react-icons/fi';

type HeartIconProps = {
  className?: string;
  // Saved vs not. The fill transition is baked in rather than left to the call
  // site because both consumers animate it identically — same reasoning as
  // SpinnerIcon prepending its own spin.
  filled?: boolean;
  // The saved-cuts empty state draws it lighter, at 1.5.
  strokeWidth?: number;
};

// Feather, via react-icons — the same path this file used to inline by hand.
// `filled` and the transition are why this stays a wrapper: react-icons has no
// equivalent, so importing FiHeart directly would push both to every call site.
const HeartIcon = ({
  className = '',
  filled = false,
  strokeWidth = 2,
}: HeartIconProps) => (
  <FiHeart
    className={`transition-[fill] duration-300 motion-reduce:transition-none ${className}`}
    fill={filled ? 'currentColor' : 'none'}
    strokeWidth={strokeWidth}
    aria-hidden='true'
  />
);

export default HeartIcon;
