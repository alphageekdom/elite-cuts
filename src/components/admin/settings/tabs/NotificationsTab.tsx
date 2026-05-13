import { Toggle, sectionTitleCls, sectionSubCls, btnPrimary } from '../SettingsUI';
import type { ShopSettings } from '@/models/ShopSettings';

const NOTIFICATIONS: { label: string; desc: string; key: keyof ShopSettings }[] = [
  { label: 'New order received', desc: 'Bell ping when a customer places an order',                          key: 'notifNewOrder' },
  { label: 'Low stock',          desc: 'Bell ping when a completed order drops a cut at or below its par level. Cuts without a par level set are skipped — set one in Inventory.', key: 'notifLowStock' },
  { label: 'Grill event created', desc: 'Bell ping when a parking-lot grill event is scheduled',             key: 'notifNewEvent' },
];

type Props = {
  values: ShopSettings;
  onChange: (patch: Partial<ShopSettings>) => void;
  onSave: () => void;
  saving: boolean;
};

export default function NotificationsTab({ values, onChange, onSave, saving }: Props) {
  return (
    <div>
      <h2 className={sectionTitleCls}>Admin <em className="italic text-oxblood font-normal">alerts</em></h2>
      <p className={sectionSubCls}>
        Control which in-app bell pings your team sees. These gate emission at write time only — turning a toggle off will not hide alerts that have already fired.
      </p>
      <div className="flex flex-col">
        {NOTIFICATIONS.map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-4 py-4 border-b border-line-soft last:border-0">
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{n.label}</div>
              <div className="text-xs text-muted max-w-[44ch]">{n.desc}</div>
            </div>
            <Toggle
              checked={values[n.key] as boolean}
              onChange={(v) => onChange({ [n.key]: v })}
            />
          </div>
        ))}
      </div>
      <div className="pt-6">
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
