import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DesktopMenu = ({ isAdmin }) => {
  const pathname = usePathname();

  return (
    <div className='hidden md:ml-6 md:block'>
      <div className='flex space-x-2'>
        <Link
          href='/'
          className={`text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2 ${
            pathname === '/' ? 'bg-black' : ''
          }`}
        >
          Home
        </Link>
        <Link
          href='/products'
          className={`text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2 ${
            pathname === '/products' ? 'bg-black' : ''
          }`}
        >
          Products
        </Link>
        {isAdmin && (
          <Link
            href='/dashboard'
            className={`text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2 ${
              pathname === '/dashboard' ? 'bg-black' : ''
            }`}
          >
            Dashboard
          </Link>
        )}
      </div>
    </div>
  );
};

export default DesktopMenu;
