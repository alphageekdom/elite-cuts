type DashboardIconProps = { className?: string };

// Four unequal panels — the conventional "dashboard" glyph. Deliberately not a
// symmetric 2×2 grid, which reads as a gallery or a category picker instead.
const DashboardIcon = ({ className }: DashboardIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={className}
  >
    <rect x='3' y='3' width='7.5' height='9.5' rx='1.5' />
    <rect x='14' y='3' width='7' height='5.5' rx='1.5' />
    <rect x='14' y='12' width='7' height='9' rx='1.5' />
    <rect x='3' y='16' width='7.5' height='5' rx='1.5' />
  </svg>
);

export default DashboardIcon;
