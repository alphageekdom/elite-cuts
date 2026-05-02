'use client';

import type { CSSProperties } from 'react';
import BarLoader from 'react-spinners/BarLoader';

const override: CSSProperties = {
  display: 'block',
  margin: '100px auto',
};

const LoadingPage = () => (
  <BarLoader
    color='#6b1f1f'
    cssOverride={override}
    width={150}
    aria-label='Loading'
  />
);

export default LoadingPage;
