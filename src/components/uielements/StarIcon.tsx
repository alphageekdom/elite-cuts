type StarIconProps = {
  className?: string;
  // Solid star (default) vs. an outline. Outline uses `strokeWidth`; a filled
  // star draws with stroke width 0 so the two read at the same visual size.
  filled?: boolean;
  strokeWidth?: number;
};

const StarIcon = ({
  className,
  filled = true,
  strokeWidth = 1.5,
}: StarIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill={filled ? 'currentColor' : 'none'}
    stroke='currentColor'
    strokeWidth={filled ? 0 : strokeWidth}
    aria-hidden='true'
    className={className}
  >
    <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
  </svg>
);

export default StarIcon;
