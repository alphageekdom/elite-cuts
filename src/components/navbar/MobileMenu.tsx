'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FOCUS_RING } from '@/lib/styles';
import ProductSearchForm from '../uielements/ProductSearchForm';
import { PRIMARY_LINKS, isActive } from './links';

type MobileMenuProps = {
  closeMobileMenu: () => void;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
};

const MobileMenu = ({
  closeMobileMenu,
  isAdmin = false,
  isLoggedIn = false,
}: MobileMenuProps) => {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `block rounded-md px-3 py-2 text-base font-medium text-ink transition-colors motion-reduce:transition-none hover:bg-cream-deep ${FOCUS_RING} ${
      isActive(pathname, href) ? 'bg-cream-deep' : ''
    }`;

  return (
    <nav
      id='mobile-menu'
      aria-label='Mobile navigation'
      className='border-t border-line bg-paper md:hidden'
    >
      <div className='space-y-1 px-4 pt-3 pb-4'>
        {PRIMARY_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMobileMenu}
            aria-current={isActive(pathname, link.href) ? 'page' : undefined}
            className={linkClass(link.href)}
          >
            {link.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href='/dashboard'
            onClick={closeMobileMenu}
            aria-current={isActive(pathname, '/dashboard') ? 'page' : undefined}
            className={linkClass('/dashboard')}
          >
            Dashboard
          </Link>
        )}
        {!isLoggedIn && (
          <Link
            href='/login'
            onClick={closeMobileMenu}
            aria-current={isActive(pathname, '/login') ? 'page' : undefined}
            className={`${linkClass('/login')} mt-2`}
          >
            Login
          </Link>
        )}
        <div className='pt-3'>
          <ProductSearchForm />
        </div>
      </div>
    </nav>
  );
};

export default MobileMenu;
