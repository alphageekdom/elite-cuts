'use client';

import CheckoutCard from '@/components/CheckoutCard';
import BackButton from '@/components/uielements/BackButton';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('your_stripe_public_key');

const CheckoutPage = () => {
  return (
    <>
      <BackButton href={'/cart'} />
      <section className='min-h-screen flex-grow bg-blue-100'>
        <div className='container m-auto w-full py-24'>
          <div className='bg-white px-6 py-8 mb-4 rounded-md m-4 md:m-0'>
            <Elements stripe={stripePromise}>
              <CheckoutCard />
            </Elements>
          </div>
        </div>
        <div className='flex-grow'></div>
      </section>
    </>
  );
};

export default CheckoutPage;
