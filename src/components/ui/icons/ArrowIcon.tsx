import { FiArrowRight } from 'react-icons/fi';

type ArrowIconProps = {
  className?: string;
  // Some call sites draw it heavier than the default.
  strokeWidth?: number;
};

// Feather, via react-icons. This used to be Lucide's single-path arrow in an
// otherwise-Feather set — a mixed-source accident rather than a design. Feather's
// head is about one unit wider; measured indistinguishable at the 14–20px sizes
// the app uses, visible side by side at 72px.
const ArrowIcon = ({ className, strokeWidth = 2 }: ArrowIconProps) => (
  <FiArrowRight
    className={className}
    strokeWidth={strokeWidth}
    aria-hidden='true'
  />
);

export default ArrowIcon;
