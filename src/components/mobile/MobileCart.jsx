import MobileCartItems from './MobileCartItems';
import MobileCartSummary from './MobileCartSummary';

const MobileCart = ({
  cartItems = [],
  handleRemoveItem,
  handleQuantityChange,
  isInModal,
  onClose,
}) => {
  return (
    <div className='flex flex-col md:flex-row overflow-y-auto h-full'>
      <div className='w-full md:w-2/3 h-[50%] md:h-full overflow-y-auto'>
        {cartItems.length > 0 ? (
          <ul className='list-none p-0'>
            {cartItems.map((item, index) => (
              <MobileCartItems
                key={index}
                item={item}
                handleRemoveItem={handleRemoveItem}
                handleQuantityChange={handleQuantityChange}
              />
            ))}
          </ul>
        ) : (
          <p className='text-center text-gray-600'>Your cart is empty.</p>
        )}
      </div>
      <div className='border-t border-gray-500 my-1 lg:border-none'></div>
      <div className='w-full md:w-1/3 h-1/2 p-2'>
        <MobileCartSummary
          cartItems={cartItems}
          isInModal={isInModal}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default MobileCart;
