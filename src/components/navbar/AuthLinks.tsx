'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FOCUS_RING, scrollAwareTone } from '@/lib/styles';

type AuthLinksProps = {
  scrolled?: boolean;
};

const AuthLinks = ({ scrolled = false }: AuthLinksProps) => {
  const pathname = usePathname();
  const loginTone = scrollAwareTone(scrolled);

  return (
    <div className='flex items-center gap-6'>
      <Link
        href='/demo'
        aria-current={pathname === '/demo' ? 'page' : undefined}
        className={`text-sm font-medium tracking-wide opacity-85 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none ${FOCUS_RING} ${loginTone}`}
      >
        Demo
      </Link>
      {/* "Sign in" / "Create account", not "Login" / "Register". The desktop
          logged-out navbar was the last holdout: "Sign in" appears throughout
          the app and "Create account" matches the register page's own CTA, so a
          visitor met two different names for the same destination depending on
          which surface they arrived from. */}
      <Link
        href='/login'
        aria-current={pathname === '/login' ? 'page' : undefined}
        className={`text-sm font-medium tracking-wide opacity-85 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none ${FOCUS_RING} ${loginTone}`}
      >
        Sign in
      </Link>
      <Link
        href='/register'
        aria-current={pathname === '/register' ? 'page' : undefined}
        className={`inline-flex items-center rounded-full bg-oxblood px-5 py-2.5 text-sm font-medium tracking-wide text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood-deep motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}
      >
        Create account
      </Link>
    </div>
  );
};

export default AuthLinks;
