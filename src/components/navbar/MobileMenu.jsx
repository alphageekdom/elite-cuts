import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProductSearchForm from '../uielements/ProductSearchForm';

const links = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/about', label: 'Our Story' },
];

const MobileMenu = ({
  closeMobileMenu,
  isAdmin,
  isLoggedIn,
  handleSignIn,
}) => {
  const pathname = usePathname();

  const linkClass = (href) =>
    `block rounded-md px-3 py-2 text-base font-medium text-ink transition-colors hover:bg-cream-deep ${
      pathname === href ? 'bg-cream-deep' : ''
    }`;

  return (
    <div
      id='mobile-menu'
      className='border-t border-line bg-paper md:hidden'
    >
      <div className='space-y-1 px-4 pt-3 pb-4'>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMobileMenu}
            className={linkClass(link.href)}
          >
            {link.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href='/dashboard'
            onClick={closeMobileMenu}
            className={linkClass('/dashboard')}
          >
            Dashboard
          </Link>
        )}
        {!isLoggedIn && (
          <div className='flex flex-col gap-2 pt-2'>
            <Link
              href='/login'
              onClick={() => {
                handleSignIn();
                closeMobileMenu();
              }}
              className={linkClass('/login')}
            >
              Login
            </Link>
          </div>
        )}
        <div className='pt-3'>
          <ProductSearchForm />
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
