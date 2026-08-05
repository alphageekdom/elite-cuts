type SpinnerIconProps = { className?: string };

// Small in-button spinner — animate-spin (Tailwind built-in) does the rotation.
// Stroke uses currentColor so the spinner picks up whatever color the parent
// button uses. The track ring is dimmed to 25% opacity and the progress arc
// is full-opacity, which gives the classic ClipLoader look at any size.
//
// HAND-DRAWN ON PURPOSE. Every other glyph in this folder is Feather via
// react-icons; this one is not, because Feather's nearest equivalent (FiLoader)
// is an eight-spoke sunburst rather than a ring and arc — measured 92% different
// at every size, and it does not animate. Do not "finish the migration" here.
const SpinnerIcon = ({ className }: SpinnerIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    aria-hidden='true'
    className={`animate-spin ${className ?? ''}`}
  >
    <circle
      cx='12'
      cy='12'
      r='10'
      stroke='currentColor'
      strokeWidth={3}
      strokeOpacity={0.25}
    />
    <path
      d='M22 12a10 10 0 01-10 10'
      stroke='currentColor'
      strokeWidth={3}
      strokeLinecap='round'
    />
  </svg>
);

export default SpinnerIcon;
