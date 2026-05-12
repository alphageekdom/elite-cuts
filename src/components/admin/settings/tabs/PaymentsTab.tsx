'use client';
import { SelectField, inputCls, labelCls, sectionTitleCls, sectionSubCls } from '../SettingsUI';

const PROVIDERS = [
  { iconCls: 'bg-[#635BFF] text-white', iconLabel: 'S', name: 'Stripe',     statusCls: 'text-green', status: 'CONNECTED · LIVE MODE',  connected: true  },
  { iconCls: 'bg-[#003087] text-white', iconLabel: 'P', name: 'PayPal',     statusCls: 'text-muted', status: 'NOT CONNECTED',          connected: false },
  { iconCls: 'bg-ink text-cream',       iconLabel: '⌘', name: 'Apple Pay',  statusCls: 'text-muted', status: 'NOT CONNECTED',          connected: false },
  { iconCls: 'bg-paper border border-line text-ink', iconLabel: 'G', name: 'Google Pay', statusCls: 'text-muted', status: 'NOT CONNECTED', connected: false },
];

const chipBase = 'inline-block px-2.5 py-1 rounded-full text-[10px] tracking-widest uppercase font-medium shrink-0';
const chipConnected = `${chipBase} bg-green/10 text-green`;
const chipDisconnected = `${chipBase} bg-cream-deep text-muted`;

export default function PaymentsTab() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className={sectionTitleCls}>
          Payment <em className="italic text-oxblood font-normal">providers</em>
        </h2>
        <p className={sectionSubCls}>
          Connect your payment processors. Stripe is required for card payments. PayPal and Apple Pay are optional checkout methods.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDERS.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-4 p-5 bg-paper border border-line-soft rounded-lg"
            >
              <div className={`w-11 h-11 rounded-lg grid place-items-center font-display font-bold text-base shrink-0 ${p.iconCls}`}>
                {p.iconLabel}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{p.name}</div>
                <div className={`text-[11px] font-mono tracking-[0.04em] ${p.statusCls}`}>{p.status}</div>
              </div>
              <span className={p.connected ? chipConnected : chipDisconnected}>
                {p.connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={sectionTitleCls}>
          Tax &amp; <em className="italic text-oxblood font-normal">currency</em>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-3">
          <div>
            <label className={labelCls}>Currency</label>
            <SelectField>
              <option>USD — US Dollar</option>
              <option>EUR</option>
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>Tax rate</label>
            <input type="text" defaultValue="7.75%" className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-muted">
          Tax is calculated automatically on all orders. For California, the combined state + local rate for San Diego is 7.75%.
        </p>
      </section>
    </div>
  );
}
