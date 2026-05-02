'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/about', label: 'Our Story' },
] as const;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2';

type DesktopMenuProps = {
  isAdmin?: boolean;
  scrolled?: boolean;
};

type NavLinkProps = {
  href: string;
  label: string;
  scrolled: boolean;
  active: boolean;
};

const NavLink = ({ href, label, scrolled, active }: NavLinkProps) => {
  const toneClass = scrolled
    ? 'text-ink focus-visible:ring-offset-cream'
    : 'text-cream focus-visible:ring-offset-transparent';

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative text-sm font-medium tracking-wide opacity-85 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none ${FOCUS_RING} ${toneClass} ${
        active
          ? 'opacity-100 after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:bg-current'
          : ''
      }`}
    >
      {label}
    </Link>
  );
};

const DesktopMenu = ({
  isAdmin = false,
  scrolled = false,
}: DesktopMenuProps) => {
  const pathname = usePathname();

  // Match sub-routes too: /products/[id] keeps "Shop" active. Home is
  // exact-match only (otherwise every route would match it).
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className='hidden items-center gap-9 md:flex'>
      {PRIMARY_LINKS.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          scrolled={scrolled}
          active={isActive(link.href)}
        />
      ))}
      {isAdmin && (
        <NavLink
          href='/dashboard'
          label='Dashboard'
          scrolled={scrolled}
          active={isActive('/dashboard')}
        />
      )}
    </div>
  );
};

export default DesktopMenu;
