import Link from 'next/link';
import { GiSteak } from 'react-icons/gi';

const Logo = () => {
  return (
    <div className='flex justify-center items-center flex-1'>
      <Link className='flex flex-shrink-0 items-center' href='/'>
        <GiSteak className='block text-5xl text-white' />
        <h3 className='hidden md:block text-white text-2xl font-bold ml-2'>
          EliteCuts
        </h3>
      </Link>
    </div>
  );
};

export default Logo;
