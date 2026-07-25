type UserIconProps = { className?: string };

// Generic person glyph — head and shoulders. Used on the sign-in page to mark
// the customer demo door against the owner's dashboard glyph.
const UserIcon = ({ className }: UserIconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={className}
  >
    <circle cx='12' cy='8' r='3.75' />
    <path d='M4.5 20.5v-.75a7.5 7.5 0 0115 0v.75' />
  </svg>
);

export default UserIcon;
