import { FiLogOut } from 'react-icons/fi';

// Door-with-arrow sign-out glyph. Two consumers — the admin sidebar's user
// menu and the mobile "more" sheet — which is why it lives here rather than
// being drawn twice; the project has had to sweep up duplicated inline icons
// before.
//
// Feather, via react-icons. The hand-drawn version merged the door, the arrow
// head and the shaft into one path; Feather splits them into three elements
// with identical coordinates.
export default function SignOutIcon({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
  return <FiLogOut className={className} strokeWidth={2} aria-hidden='true' />;
}
