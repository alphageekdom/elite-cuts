import { Toggle, SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls, btnPrimary, btnGhost } from '../SettingsUI';

const ZONES = [
  { name: 'Zone 1 — Local', detail: '0–5 MI · SAME-DAY', price: 'Free', defaultOn: true, r: 3 },
  { name: 'Zone 2 — Metro', detail: '5–15 MI · SAME-DAY', price: '$5.00', defaultOn: true, r: 6 },
  { name: 'Zone 3 — Extended', detail: '15–25 MI · NEXT-DAY', price: '$8.00', defaultOn: true, r: 10 },
];

export default function FulfillmentTab({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>
          Pickup <em className="italic text-oxblood font-normal">settings</em>
        </h2>
        <p className={sectionSubCls}>Sets the time slots shown at checkout. Capacity per slot caps orders per hour.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Slots per hour</label>
            <input type="number" defaultValue={10} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Lead time</label>
            <SelectField>
              <option>30 min</option>
              <option>1 hour</option>
              <option>2 hours</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Max booking window</label>
            <SelectField>
              <option>Same day</option>
              <option>3 days</option>
              <option>7 days</option>
            </SelectField>
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>
          Delivery <em className="italic text-oxblood font-normal">zones</em>
        </h2>
        <p className={sectionSubCls}>
          Define the areas you deliver to and the fee for each zone. Delivery is based on distance from your shop address.
        </p>
        <div className="flex flex-col">
          {ZONES.map((z) => (
            <div key={z.name} className="flex items-center gap-4 py-3.5 border-b border-line-soft last:border-0">
              <div className="w-8 h-8 rounded-full bg-cream-deep text-ink-soft grid place-items-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r={z.r} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-medium mb-0.5">{z.name}</div>
                <div className="text-[11px] text-muted font-mono tracking-[0.04em]">{z.detail}</div>
              </div>
              <div className="font-display text-[15px] font-medium mr-2">{z.price}</div>
              <Toggle defaultOn={z.defaultOn} />
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-4`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add zone
        </button>
      </section>

      <div className="flex gap-2 pt-2">
        <button type="button" className={btnPrimary} onClick={onSave}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save changes
        </button>
      </div>
    </div>
  );
}
