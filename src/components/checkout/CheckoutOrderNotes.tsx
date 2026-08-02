'use client';

import { useCheckoutContext } from '@/context/CheckoutContext';
import { BLOCK_LABEL_CLASS } from '@/components/checkout/checkoutStyles';

const CheckoutOrderNotes = () => {
  const { state, dispatch } = useCheckoutContext();

  return (
    <div className='rounded-sm border border-line-soft bg-paper px-5 py-7 sm:px-8 sm:py-8'>
      <label htmlFor='notes' className={BLOCK_LABEL_CLASS}>
        Notes for the butcher{' '}
        <span className='ml-2 text-[11px] font-normal normal-case tracking-normal'>
          optional
        </span>
      </label>
      <textarea
        id='notes'
        name='notes'
        rows={2}
        value={state.orderNotes}
        onChange={(e) => dispatch({ type: 'SET_ORDER_NOTES', payload: e.target.value })}
        placeholder='Any special cutting requests, doneness preferences, or pickup notes…'
        className='w-full resize-y border-b border-line bg-transparent pb-3.5 pt-2 text-[16px] text-ink outline-none placeholder:text-muted transition-[border-color] duration-300 focus:border-b-oxblood motion-reduce:transition-none'
      />
    </div>
  );
};

export default CheckoutOrderNotes;
