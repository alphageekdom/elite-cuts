'use client';

import { FaShoppingCart } from 'react-icons/fa';
import { useCartContext } from '@/context/CartContext';
import { FOCUS_RING, scrollAwareTone } from '@/lib/styles';

type CartCountProps = {
  onClick: () => void;
  scrolled?: boolean;
};

const CartCount = ({ onClick, scrolled = false }: CartCountProps) => {
  const { cartCount } = useCartContext();

  const toneClass = scrollAwareTone(scrolled, {
    hoverScrolled: 'hover:text-oxblood',
    hoverHero: 'hover:text-camel-soft',
  });

  const ariaLabel =
    cartCount > 0
      ? `View cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`
      : 'View cart';

  return (
    <div className='relative'>
      <button
        type='button'
        className={`relative rounded-full p-2 transition-colors duration-300 motion-reduce:transition-none ${FOCUS_RING} ${toneClass}`}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <FaShoppingCart size={22} aria-hidden='true' />
      </button>
      {cartCount > 0 && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-oxblood px-1.5 text-[11px] font-semibold leading-none text-cream'
        >
          {cartCount}
        </span>
      )}
    </div>
  );
};

export default CartCount;
