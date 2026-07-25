type ChevronIconProps = {
  className?: string;
  // Required rather than defaulted: a chevron's whole job is to point
  // somewhere, so leaving it implicit at the call site hides the one
  // detail that matters.
  direction: 'right' | 'left' | 'up' | 'down';
  // Call sites vary — ChangePill's pair are drawn heavier than the default.
  strokeWidth?: number;
};

const POINTS = {
  right: '9 18 15 12 9 6',
  left: '15 18 9 12 15 6',
  up: '18 15 12 9 6 15',
  down: '6 9 12 15 18 9',
} as const;

const ChevronIcon = ({
  className,
  direction,
  strokeWidth = 2,
}: ChevronIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth}
    aria-hidden='true'
    className={className}
  >
    <polyline points={POINTS[direction]} />
  </svg>
);

export default ChevronIcon;
