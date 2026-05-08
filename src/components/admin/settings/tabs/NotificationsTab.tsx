import { Toggle, sectionTitleCls, sectionSubCls } from '../SettingsUI';

const NOTIFICATIONS = [
  { label: 'New order received', desc: 'Alert when a customer places an order', defaultOn: true },
  { label: 'Low stock', desc: 'When any cut drops below reorder threshold', defaultOn: true },
  { label: 'Daily summary', desc: 'Orders, revenue, and stock at close of day', defaultOn: true },
  { label: 'Weekly analytics report', desc: 'Revenue trends, top sellers, and customer insights', defaultOn: false },
  { label: 'Aging room alerts', desc: 'When a cut reaches target age', defaultOn: true },
  { label: 'Dormant customer alerts', desc: "When a customer hasn't ordered in 90+ days", defaultOn: false },
];

export default function NotificationsTab() {
  return (
    <div>
      <h2 className={sectionTitleCls}>
        Email <em className="italic text-oxblood font-normal">notifications</em>
      </h2>
      <p className={sectionSubCls}>
        Control which emails are sent to you and your team. Customer-facing emails (order confirmation, pickup ready) are always sent.
      </p>
      <div className="flex flex-col">
        {NOTIFICATIONS.map((n) => (
          <div
            key={n.label}
            className="flex items-center justify-between gap-4 py-4 border-b border-line-soft last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{n.label}</div>
              <div className="text-xs text-muted max-w-[44ch]">{n.desc}</div>
            </div>
            <Toggle defaultOn={n.defaultOn} />
          </div>
        ))}
      </div>
    </div>
  );
}
