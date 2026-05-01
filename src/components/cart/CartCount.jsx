import { FaShoppingCart } from 'react-icons/fa';
import { useGlobalContext } from '@/context/CartContext';

const CartCount = ({ onClick, scrolled = false }) => {
  const { cartCount } = useGlobalContext();
  const colorClass = scrolled
    ? 'text-ink hover:text-oxblood'
    : 'text-cream hover:text-camel-soft';

  return (
    <div className='relative'>
      <button
        type='button'
        className={`relative rounded-full p-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-oxblood ${colorClass}`}
        aria-label='View Cart'
        onClick={onClick}
      >
        <FaShoppingCart size={22} aria-hidden='true' />
      </button>
      {cartCount > 0 && (
        <span className='pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-oxblood px-1.5 text-[11px] font-semibold leading-none text-cream'>
          {cartCount}
        </span>
      )}
    </div>
  );
};

export default CartCount;
