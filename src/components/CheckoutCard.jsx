'use client';

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Image from 'next/image';
import PayPalImage from '@/assets/images/paypal.png';
import StripeImage from '@/assets/images/stripe.png';

const CheckoutCard = () => {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    address: '',
  });

  const stripe = useStripe();
  const elements = useElements();

  const handleInputChange = (e) => {
    setCustomerInfo({
      ...customerInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handlePayWithPayPal = () => {
    // Navigate to PayPal payment UI/UX
    // For demonstration, we'll navigate to a hypothetical PayPal page
    window.location.href = 'https://www.paypal.com';
  };

  const handlePayWithStripe = () => {
    // Navigate to Stripe payment UI/UX
    // For demonstration, we'll navigate to a hypothetical Stripe page
    window.location.href = 'https://www.stripe.com';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Use Stripe or PayPal API for payment processing
  };

  return (
    <div className='w-full mx-auto bg-white rounded-lg overflow-hidden'>
      <div className='md:flex'>
        <div className='w-full md:w-1/2 p-8'>
          <h2 className='text-xl font-semibold mb-4'>Customer Information</h2>
          <form onSubmit={handleSubmit}>
            <div className='mb-4'>
              <label
                className='block text-gray-700 font-semibold mb-2'
                htmlFor='name'
              >
                Name
              </label>
              <input
                type='text'
                id='name'
                name='name'
                value={customerInfo.name}
                onChange={handleInputChange}
                className='w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-blue-400'
                required
              />
            </div>
            <div className='mb-4'>
              <label
                className='block text-gray-700 font-semibold mb-2'
                htmlFor='email'
              >
                Email
              </label>
              <input
                type='email'
                id='email'
                name='email'
                value={customerInfo.email}
                onChange={handleInputChange}
                className='w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-blue-400'
                required
              />
            </div>
            <div className='mb-4'>
              <label
                className='block text-gray-700 font-semibold mb-2'
                htmlFor='address'
              >
                Address
              </label>
              <input
                type='text'
                id='address'
                name='address'
                value={customerInfo.address}
                onChange={handleInputChange}
                className='w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-blue-400'
                required
              />
            </div>
            {/* Add more customer information fields as needed */}
            <button
              type='submit'
              className='bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300'
            >
              Proceed to Payment
            </button>
          </form>
        </div>
        <div className='w-full md:w-1/2 bg-gray-100 p-8 flex flex-col justify-center'>
          <h2 className='text-xl font-semibold mb-4'>Payment</h2>
          <div className='flex justify-center mb-6'>
            {/* PayPal button */}
            <button
              className='bg-blue-700 hover:bg-blue-500 text-white py-2 px-4 rounded-md mr-4'
              aria-label='Pay with PayPal'
              onClick={handlePayWithPayPal}
            >
              <Image
                src={PayPalImage}
                alt='PayPal Logo'
                width={100}
                height={30}
                className='h-[30px] w-[100px] inline bg-white object-cover'
                priority
              />
              <span className='ml-2'>Pay with PayPal</span>
            </button>
            {/* Stripe button */}
            <button
              className='bg-indigo-700 hover:bg-indigo-500 text-white py-2 px-4 rounded-md'
              aria-label='Pay with Stripe'
              onClick={handlePayWithStripe}
            >
              <Image
                src={StripeImage}
                alt='Stripe Logo'
                width={100}
                height={30}
                className='h-[30px] w-[100px] inline bg-white object-cover'
                priority
              />
              <span className='ml-2'>Pay with Card</span>
            </button>
          </div>
          <div className='border border-gray-300 rounded-md p-4'>
            <h3 className='text-lg font-semibold mb-4'>Or Pay with Card</h3>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                label: 'Credit or Debit Card Information',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCard;
