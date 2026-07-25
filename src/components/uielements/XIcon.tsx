type XIconProps = {
  className?: string;
  // Not every call site wants the heavier default — the store-info modal's
  // close control is drawn at 2.
  strokeWidth?: number;
};

const XIcon = ({ className, strokeWidth = 2.5 }: XIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth}
    aria-hidden='true'
    className={className}
  >
    <line x1='18' y1='6' x2='6' y2='18' />
    <line x1='6' y1='6' x2='18' y2='18' />
  </svg>
);

export default XIcon;
