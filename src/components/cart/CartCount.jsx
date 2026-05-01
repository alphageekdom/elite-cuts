import { FaShoppingCart } from 'react-icons/fa';
import { useGlobalContext } from '@/context/CartContext';
import { usePathname } from 'next/navigation';

const CartCount = ({ onClick }) => {
  const { cartCount } = useGlobalContext();
  const pathname = usePathname();

  return (
    <div className='relative ml-2'>
      <button
        type='button'
        className={`relative group rounded-full p-2 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 ${
          pathname === '/cart' ? 'bg-black' : 'bg-transparent'
        }`}
        aria-label='View Cart'
        onClick={onClick}
      >
        <span className='absolute -inset-1.5'></span>
        <span className='sr-only'>View cart</span>
        <FaShoppingCart size={24} aria-hidden='true' />
      </button>
      {cartCount > 0 && (
        <span className='absolute bottom-2 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full'>
          {cartCount}
        </span>
      )}
    </div>
  );
};

export default CartCount;
