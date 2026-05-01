'use client';

import Link from 'next/link';
// import { FaExclamationTriangle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

const NotFoundPage = () => {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white'>
      <h1 className='text-4xl md:text-6xl mb-4 tracking-wide font-extralight'>
        404 | Page Not Found
      </h1>
      <p className='text-lg mb-4'>
        The page you are looking for does not exist.
      </p>
      <Link className='text-blue-500 hover:underline' href='/'>
        Go back to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
