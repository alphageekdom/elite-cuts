'use client';

import BarLoader from 'react-spinners/BarLoader';

const LoadingPage = () => (
  <div role='status' aria-label='Loading' className='flex justify-center pt-25'>
    <BarLoader color='var(--color-oxblood)' width={150} />
  </div>
);

export default LoadingPage;
