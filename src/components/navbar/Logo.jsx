import Link from 'next/link';
import { GiMeatCleaver } from 'react-icons/gi';

const Logo = ({ scrolled = false }) => {
  return (
    <Link
      href='/'
      className={`flex items-center gap-2.5 font-display text-[22px] font-semibold tracking-tight transition-colors duration-300 ${
        scrolled ? 'text-ink' : 'text-cream'
      }`}
    >
      <GiMeatCleaver
        className={`text-3xl transition-colors duration-300 ${
          scrolled ? 'text-oxblood' : 'text-cream'
        }`}
        aria-hidden='true'
      />
      EliteCuts
    </Link>
  );
};

export default Logo;
