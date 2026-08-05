import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
} from 'react-icons/fi';

type ChevronIconProps = {
  className?: string;
  // Required rather than defaulted: a chevron's whole job is to point
  // somewhere, so leaving it implicit at the call site hides the one
  // detail that matters.
  direction: 'right' | 'left' | 'up' | 'down';
  // Call sites vary — ChangePill's pair are drawn heavier than the default.
  strokeWidth?: number;
};

// Feather, via react-icons — the same paths this file used to inline by hand.
// The `direction` prop is kept rather than asking call sites to pick one of four
// imports: it is the reason this wrapper exists at all.
const BY_DIRECTION = {
  right: FiChevronRight,
  left: FiChevronLeft,
  up: FiChevronUp,
  down: FiChevronDown,
} as const;

const ChevronIcon = ({
  className,
  direction,
  strokeWidth = 2,
}: ChevronIconProps) => {
  const Glyph = BY_DIRECTION[direction];
  return (
    <Glyph className={className} strokeWidth={strokeWidth} aria-hidden='true' />
  );
};

export default ChevronIcon;
