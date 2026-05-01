'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AuthLinksProps = {
  scrolled?: boolean;
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2';

const AuthLinks = ({ scrolled = false }: AuthLinksProps) => {
  const pathname = usePathname();
  const loginColor = scrolled ? 'text-ink' : 'text-cream';

  return (
    <div className='flex items-center gap-6'>
      <Link
        href='/login'
        aria-current={pathname === '/login' ? 'page' : undefined}
        className={`hidden text-sm font-medium tracking-wide opacity-85 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none md:inline ${FOCUS_RING} ${loginColor}`}
      >
        Login
      </Link>
      <Link
        href='/register'
        aria-current={pathname === '/register' ? 'page' : undefined}
        className={`inline-flex items-center rounded-full bg-oxblood px-5 py-2.5 text-sm font-medium tracking-wide text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood-deep motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}
      >
        Register
      </Link>
    </div>
  );
};

export default AuthLinks;
