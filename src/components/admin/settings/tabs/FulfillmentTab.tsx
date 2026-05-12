'use client';
import { Toggle, SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls, btnPrimary } from '../SettingsUI';
import type { ShopSettings } from '@/models/ShopSettings';

const ZONES = [
  { label: 'Zone 1 — Local',    detail: '0–5 MI · SAME-DAY',  price: 'Free',  key: 'zoneLocalEnabled' as const,    r: 3 },
  { label: 'Zone 2 — Metro',    detail: '5–15 MI · SAME-DAY', price: '$5.00', key: 'zoneMetroEnabled' as const,    r: 6 },
  { label: 'Zone 3 — Extended', detail: '15–25 MI · NEXT-DAY', price: '$8.00', key: 'zoneExtendedEnabled' as const, r: 10 },
];

type Props = {
  values: ShopSettings;
  onChange: (patch: Partial<ShopSettings>) => void;
  onSave: () => void;
  saving: boolean;
};

export default function FulfillmentTab({ values, onChange, onSave, saving }: Props) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>Pickup <em className="italic text-oxblood font-normal">settings</em></h2>
        <p className={sectionSubCls}>Sets the time slots shown at checkout. Capacity per slot caps orders per hour.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Slots per hour</label>
            <input
              type="number"
              value={values.slotsPerHour}
              onChange={(e) => onChange({ slotsPerHour: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Lead time</label>
            <SelectField value={values.leadTime} onChange={(e) => onChange({ leadTime: e.target.value })}>
              <option>30 min</option><option>1 hour</option><option>2 hours</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Max booking window</label>
            <SelectField value={values.maxBookingWindow} onChange={(e) => onChange({ maxBookingWindow: e.target.value })}>
              <option>Same day</option><option>3 days</option><option>7 days</option>
            </SelectField>
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>Delivery <em className="italic text-oxblood font-normal">zones</em></h2>
        <p className={sectionSubCls}>Define the areas you deliver to and the fee for each zone.</p>
        <div className="flex flex-col">
          {ZONES.map((z) => (
            <div key={z.key} className="flex items-center gap-4 py-3.5 border-b border-line-soft last:border-0">
              <div className="w-8 h-8 rounded-full bg-cream-deep text-ink-soft grid place-items-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r={z.r} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-medium mb-0.5">{z.label}</div>
                <div className="text-[11px] text-muted font-mono tracking-[0.04em]">{z.detail}</div>
              </div>
              <div className="font-display text-[15px] font-medium mr-2">{z.price}</div>
              <Toggle checked={values[z.key]} onChange={(v) => onChange({ [z.key]: v })} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">Pickup-only is the documented MVP scope.</p>
      </section>

      <div className="flex gap-2 pt-2">
        <button type="button" className={btnPrimary} onClick={onSave} disabled={saving}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
