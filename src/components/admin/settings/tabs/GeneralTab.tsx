import { inputCls, labelCls, sectionTitleCls, sectionSubCls, numberFromInput } from '@/components/admin/AdminForm';
import { SelectField } from '@/components/ui/SelectField';
import DemoResetCard from '../DemoResetCard';
import SettingsTabFooter from '../SettingsTabFooter';
import { DORMANCY_OPTIONS, type DormancyThreshold } from '@/lib/shop-settings/constants';
import type { SettingsTabProps } from '../SettingsClient';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const TIMEZONES = [
  // US
  'America/New_York (ET)',
  'America/Chicago (CT)',
  'America/Denver (MT)',
  'America/Phoenix (MST, no DST)',
  'America/Los_Angeles (PT)',
  'America/Anchorage (AKT)',
  'Pacific/Honolulu (HST)',
  // Canada
  'America/Halifax (AT)',
  'America/St_Johns (NT)',
  'America/Toronto (ET)',
  'America/Winnipeg (CT)',
  'America/Edmonton (MT)',
  'America/Vancouver (PT)',
];

export default function GeneralTab({ values, onChange, onSave, onDiscard, saving, dirty }: SettingsTabProps) {
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
              {US_STATES.map((s) => <option key={s}>{s}</option>)}
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
              {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
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
          Per-day open and close times come from the shop hours snapshot — editing them per day is on the roadmap.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleCls}>Pickup <em className="italic text-oxblood font-normal">slots</em></h2>
        <p className={sectionSubCls}>Sets the time slots shown at checkout. Capacity per slot caps orders per hour.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Slots per hour</label>
            <input
              type="number"
              min={1}
              max={60}
              value={values.slotsPerHour}
              onChange={(e) => onChange({ slotsPerHour: numberFromInput(e.target.value, 1) })}
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
        <h2 className={sectionTitleCls}>Customer <em className="italic text-oxblood font-normal">privacy</em></h2>
        <p className={sectionSubCls}>Controls automatic cleanup of customers who haven&apos;t returned in a long time.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Dormancy threshold</label>
            <SelectField
              value={String(values.dormancyWarningMonths)}
              onChange={(e) =>
                onChange({ dormancyWarningMonths: numberFromInput(e.target.value, 0) as DormancyThreshold })
              }
            >
              {DORMANCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
              ))}
            </SelectField>
            <p className="text-xs text-muted mt-2">
              Customers inactive this long get a 30-day warning before automatic deletion. Set to Off to disable.
            </p>
          </div>
        </div>
      </section>

      <DemoResetCard />

      <SettingsTabFooter saving={saving} dirty={dirty} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
