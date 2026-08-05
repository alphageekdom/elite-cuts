import { FiStar } from 'react-icons/fi';

type StarIconProps = {
  className?: string;
  // Solid star (default) vs. an outline. Outline uses `strokeWidth`; a filled
  // star draws with stroke width 0 so the two read at the same visual size.
  filled?: boolean;
  strokeWidth?: number;
};

// Feather, via react-icons — the same polygon this file used to inline by hand.
// `filled` is why this stays a wrapper: react-icons has no equivalent, so
// importing FiStar directly would push the fill/stroke pairing to every rating
// row that draws a star.
const StarIcon = ({
  className,
  filled = true,
  strokeWidth = 1.5,
}: StarIconProps) => (
  <FiStar
    className={className}
    fill={filled ? 'currentColor' : 'none'}
    strokeWidth={filled ? 0 : strokeWidth}
    aria-hidden='true'
  />
);

export default StarIcon;
