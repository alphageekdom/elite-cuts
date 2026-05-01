import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

const BackButton = ({ href }) => {
  return (
    <section>
      <div className='container m-auto py-6 px-6'>
        <Link
          href={href}
          className='text-sky-950 hover:text-sky-600 flex items-center'
        >
          <FaArrowLeft className='mr-2' /> Go Back
        </Link>
      </div>
    </section>
  );
};

export default BackButton;
