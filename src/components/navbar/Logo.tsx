'use client';

import Link from 'next/link';
import { GiMeatCleaver } from 'react-icons/gi';

import { FOCUS_RING } from '@/lib/styles';

type LogoProps = {
  scrolled?: boolean;
};

const Logo = ({ scrolled = false }: LogoProps) => {
  const wordmarkTone = scrolled
    ? 'text-ink focus-visible:ring-offset-cream'
    : 'text-cream focus-visible:ring-offset-transparent';
  const iconTone = scrolled ? 'text-oxblood' : 'text-cream';

  return (
    <Link
      href='/'
      className={`-m-1 flex items-center gap-2.5 whitespace-nowrap rounded-sm p-1 font-display text-[22px] font-semibold tracking-tight transition-colors duration-300 motion-reduce:transition-none ${FOCUS_RING} ${wordmarkTone}`}
    >
      <GiMeatCleaver
        className={`text-3xl transition-colors duration-300 motion-reduce:transition-none ${iconTone}`}
        aria-hidden='true'
      />
      EliteCuts
    </Link>
  );
};

export default Logo;
