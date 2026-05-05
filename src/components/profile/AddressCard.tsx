'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAddress, setDefaultAddress } from '@/actions/addresses';
import type { SerializedAddress } from '@/types/address';

type Props = {
  address: SerializedAddress;
  onEdit: (address: SerializedAddress) => void;
};

export default function AddressCard({ address, onEdit }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAddress(address._id);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to delete address');
    } else {
      toast.success('Address removed');
      setConfirming(false);
    }
  }

  async function handleSetDefault() {
    setSettingDefault(true);
    const result = await setDefaultAddress(address._id);
    setSettingDefault(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to update default');
    } else {
      toast.success('Default address updated');
    }
  }

  return (
    <div className={`bg-paper border rounded px-5 py-5 transition-colors ${address.isDefault ? 'border-ink' : 'border-line-soft'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display font-medium text-[17px] tracking-tight">{address.label}</span>
          {address.isDefault && (
            <span className="bg-ink text-cream text-[10px] font-medium tracking-widest uppercase px-2 py-0.5 rounded-full">
              Default
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onEdit(address)}
            aria-label={`Edit ${address.label} address`}
            className="text-[12px] tracking-[0.08em] uppercase text-muted hover:text-ink transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm"
          >
            Edit
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${address.label} address`}
              className="text-[12px] tracking-[0.08em] uppercase text-muted hover:text-oxblood transition-colors min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm"
            >
              Remove
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[12px] font-medium text-oxblood hover:underline disabled:opacity-50 min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm"
              >
                {deleting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                aria-label="Cancel removal"
                className="text-[12px] text-muted hover:text-ink min-h-8 min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Address lines */}
      <p className="text-[14px] text-ink-soft leading-relaxed">
        {address.address1}
        {address.address2 && <>, {address.address2}</>}
        <br />
        {address.city}, {address.state} {address.zip}
      </p>

      {/* Set default link */}
      {!address.isDefault && (
        <button
          onClick={handleSetDefault}
          disabled={settingDefault}
          className="mt-3 text-[12px] text-muted hover:text-ink border-b border-current pb-px transition-colors disabled:opacity-50"
        >
          {settingDefault ? '…' : 'Set as default'}
        </button>
      )}
    </div>
  );
}
