type PinIconProps = { className?: string };

const PinIcon = ({ className }: PinIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={className}
  >
    <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
    <circle cx='12' cy='10' r='3' />
  </svg>
);

export default PinIcon;
