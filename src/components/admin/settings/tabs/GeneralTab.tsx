import { SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls, btnPrimary, btnGhost } from '../SettingsUI';

export default function GeneralTab({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>
          Shop <em className="italic text-oxblood font-normal">profile</em>
        </h2>
        <p className={sectionSubCls}>Appears on your storefront, receipts, and customer emails.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelCls}>Shop name</label>
            <input type="text" defaultValue="EliteCuts" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input type="text" defaultValue="Hand-cut meats, butchered fresh" className={inputCls} />
          </div>
        </div>
        <div className="mb-5">
          <label className={labelCls}>Description</label>
          <textarea
            defaultValue="Hand-cut meats, butchered fresh in San Diego. Order online for same-day pickup. Sourcing from 6+ local farms, dry-aging in-house for 28 days."
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" defaultValue="(619) 555-0142" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" defaultValue="hello@elitecuts.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="url" defaultValue="https://elitecuts.com" className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>
          Shop <em className="italic text-oxblood font-normal">address</em>
        </h2>
        <p className={sectionSubCls}>
          Used for pickup instructions, delivery radius calculation, and the map on your Our Story page.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelCls}>Street address</label>
            <input type="text" defaultValue="3045 30th Street" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>
              Suite / unit{' '}
              <span className="normal-case tracking-normal text-[11px] text-muted font-normal opacity-70">optional</span>
            </label>
            <input type="text" placeholder="—" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>City</label>
            <input type="text" defaultValue="San Diego" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <SelectField defaultValue="CA">
              <option>CA</option>
              <option>NV</option>
              <option>AZ</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>ZIP</label>
            <input type="text" defaultValue="92104" className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>
          Business <em className="italic text-oxblood font-normal">hours</em>
        </h2>
        <p className={sectionSubCls}>
          Controls the time slots available on checkout and what the shop hours card displays on the schedule page.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-3">
          <div>
            <label className={labelCls}>Timezone</label>
            <SelectField>
              <option>America/Los_Angeles (PT)</option>
              <option>America/Denver (MT)</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Opens at</label>
            <SelectField defaultValue="9:00 AM">
              <option>8:00 AM</option>
              <option>9:00 AM</option>
              <option>10:00 AM</option>
            </SelectField>
          </div>
        </div>
        <p className="text-xs text-muted">
          Individual day hours can be adjusted from the{' '}
          <a href="/dashboard/schedule" className="text-oxblood border-b border-current pb-px">
            Schedule page
          </a>
          .
        </p>
      </section>

      <div className="flex gap-2 pt-2">
        <button type="button" className={btnPrimary} onClick={onSave}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save changes
        </button>
        <button type="button" className={btnGhost}>Discard</button>
      </div>
    </div>
  );
}
