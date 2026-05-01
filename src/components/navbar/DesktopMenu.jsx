import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/about', label: 'Our Story' },
];

const NavLink = ({ href, label, scrolled, active }) => {
  const colorClass = scrolled
    ? 'text-ink hover:opacity-100'
    : 'text-cream hover:opacity-100';

  return (
    <Link
      href={href}
      className={`relative text-sm font-medium tracking-wide opacity-85 transition-opacity duration-300 ${colorClass} ${
        active
          ? 'opacity-100 after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:bg-current'
          : ''
      }`}
    >
      {label}
    </Link>
  );
};

const DesktopMenu = ({ isAdmin, scrolled = false }) => {
  const pathname = usePathname();

  return (
    <div className='hidden items-center gap-9 md:flex'>
      {links.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          scrolled={scrolled}
          active={pathname === link.href}
        />
      ))}
      {isAdmin && (
        <NavLink
          href='/dashboard'
          label='Dashboard'
          scrolled={scrolled}
          active={pathname === '/dashboard'}
        />
      )}
    </div>
  );
};

export default DesktopMenu;
