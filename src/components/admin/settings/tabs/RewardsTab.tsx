import { SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls, btnPrimary, btnGhost } from '../SettingsUI';
import type { ShopSettings } from '@/models/ShopSettings';
import { computeRedemptionCap } from '@/lib/rewards';

type Props = {
  values: ShopSettings;
  onChange: (patch: Partial<ShopSettings>) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
};

const WEEKEND_MULTIPLIERS: { value: number; label: string }[] = [
  { value: 1, label: '1× (none)' },
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
];

const EXPIRY_OPTIONS: { value: number; label: string }[] = [
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
  { value: 0, label: 'Never' },
];

export default function RewardsTab({ values, onChange, onSave, onDiscard, saving }: Props) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>Rewards <em className="italic text-oxblood font-normal">program</em></h2>
        <p className={sectionSubCls}>Configure how customers earn and redeem points. Changes apply to all future transactions — existing point balances are not affected.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelCls}>Points per $1</label>
            <input
              type="number"
              min={0}
              value={values.pointsPerDollar}
              onChange={(e) => onChange({ pointsPerDollar: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Weekend multiplier</label>
            <SelectField
              value={values.weekendMultiplier}
              onChange={(e) => onChange({ weekendMultiplier: Number(e.target.value) })}
            >
              {WEEKEND_MULTIPLIERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Points expiry</label>
            <SelectField
              value={values.pointsExpiryMonths}
              onChange={(e) => onChange({ pointsExpiryMonths: Number(e.target.value) })}
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Redemption — points</label>
            <input
              type="number"
              min={1}
              value={values.redemptionPoints}
              onChange={(e) => onChange({ redemptionPoints: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Redemption — dollars</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={values.redemptionDollars}
              onChange={(e) => onChange({ redemptionDollars: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Min to redeem</label>
            <input
              type="number"
              min={0}
              value={values.minToRedeem}
              onChange={(e) => onChange({ minToRedeem: Number(e.target.value) })}
              placeholder="No minimum"
              className={inputCls}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {values.redemptionPoints} pts = ${Number.isInteger(values.redemptionDollars) ? values.redemptionDollars : values.redemptionDollars.toFixed(2)} off at checkout
        </p>
      </section>

      <section>
        <h2 className={sectionTitleCls}>Per-order <em className="italic text-oxblood font-normal">cap</em></h2>
        <p className={sectionSubCls}>Limits how much of an order can be paid with points. Effective cap = min(% of subtotal, flat $). Customers can never redeem more than this on a single order, regardless of balance.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-3">
          <div>
            <label className={labelCls}>Max % of subtotal</label>
            <input
              type="number"
              min={1}
              max={100}
              value={values.maxRedemptionPercent}
              onChange={(e) => onChange({ maxRedemptionPercent: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max dollars</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={values.maxRedemptionDollars}
              onChange={(e) => onChange({ maxRedemptionDollars: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          {(() => {
            const cap80 = computeRedemptionCap(80, values);
            const cap250 = computeRedemptionCap(250, values);
            return `Example: on an $80 order, max redemption = $${cap80.capDollars.toFixed(2)}. On a $250 order, max = $${cap250.capDollars.toFixed(2)}.`;
          })()}
        </p>
      </section>

      <section>
        <h2 className={sectionTitleCls}>Tier <em className="italic text-oxblood font-normal">thresholds</em></h2>
        <p className={sectionSubCls}>Points needed to unlock each tier.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-3">
          <div>
            <label className={labelCls}>Connoisseur (pts)</label>
            <input
              type="number"
              min={0}
              value={values.connoisseurThreshold}
              onChange={(e) => onChange({ connoisseurThreshold: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Master Cut (pts)</label>
            <input
              type="number"
              min={0}
              value={values.masterCutThreshold}
              onChange={(e) => onChange({ masterCutThreshold: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Qualifying window (months)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={values.tierWindowMonths}
              onChange={(e) => onChange({ tierWindowMonths: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          {values.tierWindowMonths > 0
            ? `Tier is based on points earned in the customer's rolling ${values.tierWindowMonths}-month qualifying period. Tier-ups happen immediately; tier-downs only at the annual check. Redeeming points doesn't affect tier.`
            : 'Tier is based on lifetime points earned. Customers keep their tier once earned and never drop down.'}
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
