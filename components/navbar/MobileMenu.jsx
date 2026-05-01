import Link from 'next/link';
import ProductSearchForm from '../uielements/ProductSearchForm';
import { usePathname } from 'next/navigation';

const MobileMenu = ({ closeMobileMenu, isAdmin, isLoggedIn, handleSignIn }) => {
  const pathname = usePathname();
  return (
    <div className='md:hidden' id='mobile-menu'>
      <div className='space-y-1 px-2 pb-3 pt-2'>
        <Link
          href='/'
          className={`block rounded-md px-3 py-2 text-white text-base font-medium hover:bg-gray-900 ${
            pathname === '/' ? 'bg-footer-bg ' : ''
          }`}
          onClick={closeMobileMenu}
        >
          Home
        </Link>
        <Link
          href='/products'
          className={`block rounded-md px-3 py-2 text-white text-base font-medium hover:bg-gray-900 ${
            pathname === '/products' ? 'bg-footer-bg ' : ''
          }`}
          onClick={closeMobileMenu}
        >
          Products
        </Link>
        {isAdmin && (
          <Link
            href='/dashboard'
            className={`block rounded-md px-3 py-2 text-white text-base font-medium hover:bg-gray-900 ${
              pathname === '/dashboard' ? 'bg-footer-bg ' : ''
            }`}
            onClick={closeMobileMenu}
          >
            Dashboard
          </Link>
        )}
        {!isLoggedIn && (
          <div className='flex flex-col gap-2'>
            <Link
              onClick={() => {
                handleSignIn();
                closeMobileMenu();
              }}
              href={'/login'}
              className={`block rounded-md px-3 py-2 text-white text-base font-medium hover:bg-gray-900 ${
                pathname === '/login' ? 'bg-footer-bg ' : ''
              }`}
            >
              <i className='fa-brands fa-google text-white'></i>
              <span>Login</span>
            </Link>
            <Link
              onClick={() => {
                handleSignIn();
                closeMobileMenu();
              }}
              href={'/register'}
              className={`block rounded-md px-3 py-2 text-white text-base font-medium hover:bg-gray-900 ${
                pathname === '/register' ? 'bg-footer-bg ' : ''
              }`}
            >
              <span>Register</span>
            </Link>
          </div>
        )}
        <ProductSearchForm />
      </div>
    </div>
  );
};

export default MobileMenu;
