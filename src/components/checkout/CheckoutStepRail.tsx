import { Fragment } from 'react';

import CheckIcon from '@/components/ui/icons/CheckIcon';

type Props = { currentStep: 2 | 3 };

const STEPS = ['Cart', 'Checkout', 'Confirmation'] as const;

const CheckoutStepRail = ({ currentStep }: Props) => (
  <div className='border-b border-line-soft py-7'>
    <div className='mx-auto max-w-300 px-8'>
      <nav aria-label='Checkout steps' className='flex items-center justify-center gap-4'>
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep || currentStep === 3;
          const isCurrent = stepNum === currentStep;
          const isPending = stepNum > currentStep && currentStep !== 3;

          return (
            <Fragment key={label}>
              {i > 0 && <span className='h-px w-7 bg-line' aria-hidden='true' />}
              <div
                className={`flex items-center gap-2.5 text-[13px] font-medium ${isPending ? 'text-muted' : 'text-ink'}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`grid h-6.5 w-6.5 place-items-center rounded-full border ${
                    isDone
                      ? 'border-green bg-green text-cream'
                      : isCurrent
                        ? 'border-ink bg-ink font-display italic text-[12px] text-cream'
                        : 'border-line bg-paper font-display italic text-[12px] text-muted'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckIcon className='h-2.75 w-2.75' />
                      <span className='sr-only'>Completed</span>
                    </>
                  ) : (
                    stepNum
                  )}
                </span>
                {label === 'Confirmation' ? (
                  <span className='hidden sm:inline'>{label}</span>
                ) : (
                  label
                )}
              </div>
            </Fragment>
          );
        })}
      </nav>
    </div>
  </div>
);

export default CheckoutStepRail;
