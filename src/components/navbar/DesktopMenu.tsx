'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FOCUS_RING, scrollAwareTone } from '@/lib/styles';
import { PRIMARY_LINKS, isActive } from './links';

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
  const toneClass = scrollAwareTone(scrolled);

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

  return (
    <div className='hidden items-center gap-9 md:flex'>
      {PRIMARY_LINKS.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          scrolled={scrolled}
          active={isActive(pathname, link.href)}
        />
      ))}
      {isAdmin && (
        <NavLink
          href='/dashboard'
          label='Dashboard'
          scrolled={scrolled}
          active={isActive(pathname, '/dashboard')}
        />
      )}
    </div>
  );
};

export default DesktopMenu;
