import React from 'react';
import { FaTrash } from 'react-icons/fa';

const MobileCartItems = ({ item, handleRemoveItem, handleQuantityChange }) => {
  const { product, quantity } = item;
  return (
    <li className='flex justify-between items-center py-4 border-b border-gray-200'>
      <div className='flex items-center'>
        <img
          src={`/images/products/${product?.images[0]}`}
          alt={item.product?.name}
          className='w-16 h-16 object-cover'
        />
        <div className='ml-4'>
          <h3 className='text-lg font-medium'>{item.product?.name}</h3>
          <p className='text-gray-600'>${item.product?.price.toFixed(2)}</p>
        </div>
      </div>
      <div className='flex items-center'>
        <button
          type='button'
          onClick={() => handleQuantityChange(item._id, -1)}
          className='text-gray-600 hover:text-gray-800'
        >
          -
        </button>
        <span className='mx-2'>{quantity}</span>
        <button
          type='button'
          onClick={() => handleQuantityChange(item._id, 1)}
          className='text-gray-600 hover:text-gray-800'
        >
          +
        </button>
        <button
          type='button'
          onClick={() => handleRemoveItem(item._id)}
          className='text-red-600 hover:text-red-800 ml-4'
        >
          <FaTrash />
        </button>
      </div>
    </li>
  );
};

export default MobileCartItems;
