type CheckIconProps = { className?: string; strokeWidth?: number };

const CheckIcon = ({ className, strokeWidth = 2.5 }: CheckIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth}
    aria-hidden='true'
    className={className}
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
);

export default CheckIcon;
