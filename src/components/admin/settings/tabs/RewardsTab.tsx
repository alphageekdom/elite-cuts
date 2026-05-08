import { SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls, btnPrimary } from '../SettingsUI';

export default function RewardsTab({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>
          Rewards <em className="italic text-oxblood font-normal">program</em>
        </h2>
        <p className={sectionSubCls}>
          Configure how customers earn and redeem points. Changes apply to all future transactions — existing point balances are not affected.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelCls}>Points per $1</label>
            <input type="number" defaultValue={1} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Weekend multiplier</label>
            <SelectField>
              <option>1× (none)</option>
              <option>2×</option>
              <option>3×</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Points expiry</label>
            <SelectField>
              <option>6 months</option>
              <option>12 months</option>
              <option>Never</option>
            </SelectField>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Redemption rate</label>
            <input type="text" defaultValue="100 pts = $5 off" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Min to redeem</label>
            <input type="number" defaultValue={0} placeholder="No minimum" className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>
          Tier <em className="italic text-oxblood font-normal">thresholds</em>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-3">
          <div>
            <label className={labelCls}>Connoisseur (pts)</label>
            <input type="number" defaultValue={250} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Master Cut (pts)</label>
            <input type="number" defaultValue={1000} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tier reset</label>
            <SelectField>
              <option>Never (lifetime)</option>
              <option>Annual</option>
            </SelectField>
          </div>
        </div>
        <p className="text-xs text-muted">
          Tier status is based on lifetime points earned. Customers keep their tier once earned and never drop down.
        </p>
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
