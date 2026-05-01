import React from 'react';
import Image from 'next/image'; // Assuming you're using Next.js
import { FaMinus, FaPlus, FaTrash } from 'react-icons/fa';

const CartCardItem = ({
  item,
  index,
  handleQuantityChange,
  handleRemoveItem,
}) => {
  return (
    <li key={index} className='grid grid-cols-2 md:grid-cols-5 p-4'>
      {/* col 1 */}
      <div className='flex-shrink-0 w-100 h-32 flex items-center justify-center'>
        <Image
          src={`/images/products/${item['product']['images'][0]}`}
          alt={item['product']['name']}
          className='object-cover w-32 h-32 rounded-full p-2'
          width={300}
          height={300}
          priority={true}
        />
      </div>
      {/* col 2 */}
      <div className='flex items-center text-left p-2'>
        <h2 className='text-lg text-left font-semibold'>
          {item['product']['name']}
        </h2>
      </div>
      {/* col 3 */}
      <div className='flex items-center justify-center order-4 p-2'>
        <p className='text-gray-600'>${item['product']['price']}</p>
      </div>
      {/* col 4 */}
      <div className='flex items-center justify-center order-3 p-2 gap-5'>
        <button
          type='button'
          className='text-gray-500 focus:outline-none'
          aria-label='Decrease'
          onClick={() => handleQuantityChange(item._id, -1)} // Decrement quantity
        >
          <FaMinus />
        </button>
        <span>{item.quantity}</span>
        <button
          type='button'
          className='text-gray-500 focus:outline-none z-10'
          aria-label='Increase'
          onClick={() => handleQuantityChange(item._id, 1)} // Increment quantity
        >
          <FaPlus />
        </button>
      </div>
      {/* col-5 */}
      <div className='flex items-center order-5 p-2'>
        <button
          type='button'
          aria-label='Delete'
          className='w-full flex justify-center py-2 px-4 border rounded-md  bg-red-600 text-white'
          onClick={() => handleRemoveItem(item._id)}
        >
          <FaTrash />
        </button>
      </div>
    </li>
  );
};

export default CartCardItem;
