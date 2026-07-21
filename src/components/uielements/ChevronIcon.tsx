type ChevronIconProps = {
  className?: string;
  // Required rather than defaulted: a chevron's whole job is to point
  // somewhere, so leaving it implicit at the call site hides the one
  // detail that matters. `up` / `down` land here when the inline
  // chevrons elsewhere migrate — ChangePill needs both at once, so add
  // them together rather than half the pair.
  direction: 'right' | 'left';
};

const POINTS = {
  right: '9 18 15 12 9 6',
  left: '15 18 9 12 15 6',
} as const;

const ChevronIcon = ({ className, direction }: ChevronIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={className}
  >
    <polyline points={POINTS[direction]} />
  </svg>
);

export default ChevronIcon;
