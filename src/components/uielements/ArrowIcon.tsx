type ArrowIconProps = {
  className?: string;
  // Some call sites draw it heavier than the default.
  strokeWidth?: number;
};

const ArrowIcon = ({ className, strokeWidth = 2 }: ArrowIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth}
    aria-hidden='true'
    className={className}
  >
    <path d='M5 12h14M13 5l7 7-7 7' />
  </svg>
);

export default ArrowIcon;
