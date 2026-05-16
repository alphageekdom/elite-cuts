type CheckIconProps = { className?: string };

const CheckIcon = ({ className }: CheckIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.5}
    aria-hidden='true'
    className={className}
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
);

export default CheckIcon;
