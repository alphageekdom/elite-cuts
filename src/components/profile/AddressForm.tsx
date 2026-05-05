'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { addAddress, updateAddress } from '@/actions/addresses';
import type { SerializedAddress, AddressFormData } from '@/types/address';

const FIELD_CLASS =
  'w-full bg-cream border border-line rounded px-4 py-3 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

const LABEL_CLASS = 'block text-[11px] tracking-[0.14em] uppercase text-muted mb-1.5';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

type Props = {
  editing?: SerializedAddress;
  onDone: () => void;
};

const empty: AddressFormData = {
  label: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  isDefault: false,
};

export default function AddressForm({ editing, onDone }: Props) {
  const [form, setForm] = useState<AddressFormData>(
    editing
      ? {
          label: editing.label,
          address1: editing.address1,
          address2: editing.address2 ?? '',
          city: editing.city,
          state: editing.state,
          zip: editing.zip,
          isDefault: editing.isDefault,
        }
      : empty,
  );
  const [loading, setLoading] = useState(false);

  function set(field: keyof AddressFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const result = editing
      ? await updateAddress(editing._id.toString(), form)
      : await addAddress(form);

    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? 'Something went wrong');
      return;
    }

    toast.success(editing ? 'Address updated' : 'Address added');
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper border border-line rounded p-6 space-y-4">
      <h3 className="font-display text-[20px] tracking-tight">
        {editing ? 'Edit address' : 'New address'}
      </h3>

      {/* Label */}
      <div>
        <label htmlFor="addr-label" className={LABEL_CLASS}>Label</label>
        <input
          id="addr-label"
          className={FIELD_CLASS}
          placeholder="e.g. Home, Work"
          value={form.label}
          onChange={(e) => set('label', e.target.value)}
          required
          maxLength={40}
        />
      </div>

      {/* Address line 1 */}
      <div>
        <label htmlFor="addr-line1" className={LABEL_CLASS}>Street address</label>
        <input
          id="addr-line1"
          className={FIELD_CLASS}
          placeholder="123 Main St"
          value={form.address1}
          onChange={(e) => set('address1', e.target.value)}
          required
          maxLength={120}
        />
      </div>

      {/* Address line 2 */}
      <div>
        <label htmlFor="addr-line2" className={LABEL_CLASS}>
          Apt / Suite <span className="normal-case tracking-normal opacity-60">(optional)</span>
        </label>
        <input
          id="addr-line2"
          className={FIELD_CLASS}
          placeholder="Apt 4B"
          value={form.address2}
          onChange={(e) => set('address2', e.target.value)}
          maxLength={80}
        />
      </div>

      {/* City / State / Zip row */}
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_120px_120px] gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="addr-city" className={LABEL_CLASS}>City</label>
          <input
            id="addr-city"
            className={FIELD_CLASS}
            placeholder="San Diego"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div>
          <label htmlFor="addr-state" className={LABEL_CLASS}>State</label>
          <select
            id="addr-state"
            className={FIELD_CLASS}
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            required
          >
            <option value="">—</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="addr-zip" className={LABEL_CLASS}>ZIP</label>
          <input
            id="addr-zip"
            className={FIELD_CLASS}
            placeholder="92101"
            value={form.zip}
            onChange={(e) => set('zip', e.target.value)}
            required
            maxLength={10}
            pattern="\d{5}(-\d{4})?"
          />
        </div>
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={form.isDefault}
            onChange={(e) => set('isDefault', e.target.checked)}
          />
          <div className="w-9 h-5 rounded-full bg-line peer-checked:bg-ink transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-[13px] text-ink-soft">Set as default address</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-2.5 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          {loading ? 'Saving…' : editing ? 'Save changes' : 'Add address'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-[13px] text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
