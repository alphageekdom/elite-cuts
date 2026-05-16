type MinusIconProps = { className?: string };

const MinusIcon = ({ className }: MinusIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.5}
    aria-hidden='true'
    className={className}
  >
    <line x1='5' y1='12' x2='19' y2='12' />
  </svg>
);

export default MinusIcon;
