'use client';

import { BLOCK_LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import type {
  DeliveryAddress,
  SavedAddress,
} from '@/context/CheckoutContext';

const norm = (s: string): string => s.trim().toLowerCase();

// All five fields must match for a saved address to be considered the
// currently-selected one. Trim + lowercase the text fields so capitalisation
// or trailing whitespace differences don't drop the highlight.
const matchesSaved = (a: DeliveryAddress, sa: SavedAddress): boolean =>
  norm(a.address1) === norm(sa.address1) &&
  norm(a.address2) === norm(sa.address2) &&
  norm(a.city) === norm(sa.city) &&
  a.state.trim().toUpperCase() === sa.state.trim().toUpperCase() &&
  a.zip.trim() === sa.zip.trim();

const formatSavedAddressLine = (sa: SavedAddress): string => {
  const line2 = sa.address2 ? ` ${sa.address2}` : '';
  return `${sa.address1}${line2}, ${sa.city}, ${sa.state} ${sa.zip}`;
};

type Props = {
  savedAddresses: SavedAddress[];
  currentAddress: DeliveryAddress;
  onPick: (sa: SavedAddress) => void;
};

const SavedAddressPicker = ({ savedAddresses, currentAddress, onPick }: Props) => {
  if (savedAddresses.length === 0) return null;
  return (
    <div className='mb-6'>
      <div className={`${BLOCK_LABEL_CLASS} mb-2.5`}>Your saved addresses</div>
      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
        {savedAddresses.map((sa) => {
          const isSelected = matchesSaved(currentAddress, sa);
          return (
            <button
              key={sa.id}
              type='button'
              onClick={() => onPick(sa)}
              aria-pressed={isSelected}
              className={`flex flex-col gap-1 rounded-sm border px-4 py-3.5 text-left transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                isSelected
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line bg-cream text-ink hover:border-ink'
              }`}
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='font-display text-[14px] font-medium tracking-tight'>
                  {sa.label}
                </span>
                {sa.isDefault && (
                  <span
                    className={`font-mono text-[10px] tracking-[0.08em] ${
                      isSelected ? 'text-cream/70' : 'text-muted'
                    }`}
                  >
                    DEFAULT
                  </span>
                )}
              </div>
              <span
                className={`text-[12px] leading-snug ${
                  isSelected ? 'text-cream/80' : 'text-ink-soft'
                }`}
              >
                {formatSavedAddressLine(sa)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SavedAddressPicker;
