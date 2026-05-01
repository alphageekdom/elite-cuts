'use client';
import ClipLoader from 'react-spinners/ClipLoader';

const override = {
  display: 'block',
  margin: '100px auto',
};

const LoadingPage = () => {
  return (
    <ClipLoader
      color={'#B91C1B'}
      cssOverride={override}
      size={150}
      aria-label='Loading Spinner'
    />
  );
};

export default LoadingPage;
