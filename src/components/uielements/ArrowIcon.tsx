type ArrowIconProps = { className?: string };

const ArrowIcon = ({ className }: ArrowIconProps) => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={className}
  >
    <path d='M5 12h14M13 5l7 7-7 7' />
  </svg>
);

export default ArrowIcon;
