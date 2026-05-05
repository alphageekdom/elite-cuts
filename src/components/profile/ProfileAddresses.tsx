'use client';

import { useState } from 'react';
import AddressCard from '@/components/profile/AddressCard';
import AddressForm from '@/components/profile/AddressForm';
import type { SerializedAddress } from '@/types/address';

type Props = {
  addresses: SerializedAddress[];
};

export default function ProfileAddresses({ addresses }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SerializedAddress | undefined>(undefined);

  function openNew() {
    setEditing(undefined);
    setShowForm(true);
  }

  function openEdit(address: SerializedAddress) {
    setEditing(address);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(undefined);
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-7 gap-5">
        <div>
          <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
            Saved <em className="italic text-oxblood">addresses</em>
          </h2>
        </div>
        {!showForm && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-soft border-b border-current pb-px hover:text-oxblood hover:gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm"
          >
            + Add address
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <AddressForm editing={editing} onDone={closeForm} />
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="bg-paper border border-dashed border-line rounded p-14 text-center">
          <div className="w-14 h-14 rounded-full bg-cream-deep text-ink-soft flex items-center justify-center mx-auto mb-5" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <h3 className="font-display font-medium text-[22px] tracking-tight mb-2">No addresses saved</h3>
          <p className="text-muted text-sm mb-6 max-w-[32ch] mx-auto">
            Save an address for faster pickup and account management.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-3 rounded-full hover:bg-oxblood transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <AddressCard key={addr._id} address={addr} onEdit={openEdit} />
          ))}
        </div>
      )}
    </section>
  );
}
