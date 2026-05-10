'use client';

import { type ChangeEvent } from 'react';
import Link from 'next/link';

import { useCheckoutContext } from '@/context/CheckoutContext';
import CheckoutFieldCheck from '@/components/checkout/CheckoutFieldCheck';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import { EMAIL_RE } from '@/lib/validation';

const CheckoutContactCard = () => {
  const { state, dispatch } = useCheckoutContext();
  const { contactName, contactEmail, contactPhone } = state;

  const isNameValid = contactName.trim().length >= 5;
  const isEmailValid = EMAIL_RE.test(contactEmail.trim());
  const isPhoneValid = contactPhone.replace(/\D/g, '').length >= 10;

  const onPhone = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    dispatch({ type: 'SET_CONTACT', payload: { name: contactName, email: contactEmail, phone: formatted } });
  };

  return (
    <div className='rounded-sm border border-line-soft bg-paper px-5 py-7 sm:px-8 sm:py-8'>
      <div className='mb-7 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4'>
        <span className='font-display text-[22px] font-medium tracking-tight'>
          Your <em className='font-normal text-oxblood'>details</em>
        </span>
        <span className='text-[12px] text-muted'>
          Already a member?{' '}
          <Link href='/login' className='border-b border-current text-oxblood'>
            Sign in
          </Link>
        </span>
      </div>

      <div className='mb-6'>
        <div className='mb-2.5 flex items-center justify-between'>
          <label htmlFor='fullName' className={LABEL_CLASS}>
            Full name
          </label>
          {isNameValid && <CheckoutFieldCheck />}
        </div>
        <input
          id='fullName'
          type='text'
          name='name'
          value={contactName}
          onChange={(e) => dispatch({ type: 'SET_CONTACT', payload: { name: e.target.value, email: contactEmail, phone: contactPhone } })}
          placeholder='Tangelo Doe'
          autoComplete='name'
          className={FIELD_CLASS}
        />
      </div>

      <div className='grid grid-cols-2 gap-3.5'>
        <div>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='email' className={LABEL_CLASS}>
              Email
            </label>
            {isEmailValid && <CheckoutFieldCheck />}
          </div>
          <input
            id='email'
            type='email'
            name='email'
            value={contactEmail}
            onChange={(e) => dispatch({ type: 'SET_CONTACT', payload: { name: contactName, email: e.target.value, phone: contactPhone } })}
            placeholder='you@example.com'
            autoComplete='email'
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <div className='mb-2.5 flex items-center justify-between'>
            <label htmlFor='phone' className={LABEL_CLASS}>
              Phone
            </label>
            {isPhoneValid && <CheckoutFieldCheck />}
          </div>
          <input
            id='phone'
            type='tel'
            name='phone'
            value={contactPhone}
            onChange={onPhone}
            placeholder='(619) 555-0123'
            autoComplete='tel'
            maxLength={14}
            className={FIELD_CLASS}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutContactCard;
