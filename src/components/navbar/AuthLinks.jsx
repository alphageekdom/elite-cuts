import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AuthLinks = ({ handleSignIn }) => {
  const pathname = usePathname();

  return (
    <div className='hidden md:block md:ml-6'>
      <div className='flex items-center gap-4'>
        <Link
          href='/login'
          className={`text-white hover:bg-gray-900 hover:text-white rounded-md px-5 py-2 ${
            pathname === '/login' ? 'bg-black' : ''
          }`}
          onClick={handleSignIn}
        >
          Login
        </Link>
        <Link
          href='/register'
          className={`text-white hover:bg-gray-900 hover:text-white rounded-md px-5 py-2 ${
            pathname === '/register' ? 'bg-black' : ''
          }`}
        >
          Register
        </Link>
      </div>
    </div>
  );
};

export default AuthLinks;
