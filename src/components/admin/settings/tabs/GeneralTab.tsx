import { SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls, btnPrimary, btnGhost } from '../SettingsUI';
import type { ShopSettings } from '@/models/ShopSettings';

type Props = {
  values: ShopSettings;
  onChange: (patch: Partial<ShopSettings>) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
};

export default function GeneralTab({ values, onChange, onSave, onDiscard, saving }: Props) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>Shop <em className="italic text-oxblood font-normal">profile</em></h2>
        <p className={sectionSubCls}>Appears on your storefront, receipts, and customer emails.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelCls}>Shop name</label>
            <input type="text" value={values.shopName} onChange={(e) => onChange({ shopName: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input type="text" value={values.tagline} onChange={(e) => onChange({ tagline: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="mb-5">
          <label className={labelCls}>Description</label>
          <textarea value={values.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} className={`${inputCls} resize-y`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={values.email} onChange={(e) => onChange({ email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="url" value={values.website} onChange={(e) => onChange({ website: e.target.value })} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>Shop <em className="italic text-oxblood font-normal">address</em></h2>
        <p className={sectionSubCls}>Used for pickup instructions, delivery radius calculation, and the map on your Our Story page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelCls}>Street address</label>
            <input type="text" value={values.street} onChange={(e) => onChange({ street: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Suite / unit <span className="normal-case tracking-normal text-[11px] text-muted font-normal opacity-70">optional</span></label>
            <input type="text" value={values.suite} onChange={(e) => onChange({ suite: e.target.value })} placeholder="—" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>City</label>
            <input type="text" value={values.city} onChange={(e) => onChange({ city: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <SelectField value={values.state} onChange={(e) => onChange({ state: e.target.value })}>
              <option>CA</option><option>NV</option><option>AZ</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>ZIP</label>
            <input type="text" value={values.zip} onChange={(e) => onChange({ zip: e.target.value })} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>Business <em className="italic text-oxblood font-normal">hours</em></h2>
        <p className={sectionSubCls}>Controls the time slots available on checkout and what the shop hours card displays on the schedule page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-3">
          <div>
            <label className={labelCls}>Timezone</label>
            <SelectField value={values.timezone} onChange={(e) => onChange({ timezone: e.target.value })}>
              <option>America/Los_Angeles (PT)</option>
              <option>America/Denver (MT)</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Opens at</label>
            <SelectField value={values.opensAt} onChange={(e) => onChange({ opensAt: e.target.value })}>
              <option>8:00 AM</option><option>9:00 AM</option><option>10:00 AM</option>
            </SelectField>
          </div>
        </div>
        <p className="text-xs text-muted">
          Individual day hours can be adjusted from the{' '}
          <a href="/dashboard/schedule" className="text-oxblood border-b border-current pb-px">Schedule page</a>.
        </p>
      </section>

      <div className="flex gap-2 pt-2">
        <button type="button" className={btnPrimary} onClick={onSave} disabled={saving}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onDiscard} className={btnGhost}>Discard</button>
      </div>
    </div>
  );
}
