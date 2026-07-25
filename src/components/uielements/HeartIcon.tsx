type HeartIconProps = {
  className?: string;
  // Saved vs not. The fill transition is baked in rather than left to the call
  // site because both consumers animate it identically — same reasoning as
  // SpinnerIcon prepending its own spin.
  filled?: boolean;
};

const HeartIcon = ({ className = '', filled = false }: HeartIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill={filled ? 'currentColor' : 'none'}
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={`transition-[fill] duration-300 motion-reduce:transition-none ${className}`}
  >
    <path d='M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' />
  </svg>
);

export default HeartIcon;
