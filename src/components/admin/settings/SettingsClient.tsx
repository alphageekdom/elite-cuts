'use client';

import { useState } from 'react';

type Tab = 'general' | 'team' | 'payments' | 'fulfillment' | 'notifications' | 'rewards' | 'danger';

// ─── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
      className={`relative w-11 h-6 rounded-full border shrink-0 transition-colors duration-300 ${
        on ? 'bg-green border-green' : 'bg-cream-deep border-line'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

// ─── Select wrapper ──────────────────────────────────────────────────────────
function SelectField({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className="appearance-none w-full border border-line bg-paper font-sans text-sm text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors cursor-pointer pr-9"
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

// ─── Shared class strings ────────────────────────────────────────────────────
const inputCls =
  'w-full border border-line bg-paper text-sm text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors placeholder:text-muted/60';
const labelCls =
  'block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-2';
const sectionTitleCls =
  'font-display text-[22px] font-medium tracking-[-0.015em]';
const sectionSubCls = 'text-sm text-muted mb-6 max-w-[56ch]';
const btnPrimary =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] border border-transparent transition-colors hover:bg-oxblood cursor-pointer';
const btnGhost =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-paper text-ink-soft text-[13px] font-medium tracking-[0.02em] border border-line transition-colors hover:border-ink hover:text-ink cursor-pointer';
const btnDanger =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent text-oxblood text-[13px] font-medium tracking-[0.02em] border border-oxblood/30 transition-colors hover:bg-red-soft hover:border-oxblood cursor-pointer';

// ─── Save toast ──────────────────────────────────────────────────────────────
function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2.5 bg-ink text-cream px-6 py-3 rounded-full text-sm font-medium shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-transform duration-400 ${
        visible ? 'translate-y-0' : 'translate-y-35'
      }`}
    >
      <svg className="w-4 h-4 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Settings saved
    </div>
  );
}

// ─── Nav tab config ──────────────────────────────────────────────────────────
const MAIN_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'general',
    label: 'General',
    icon: (
      <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: 'team',
    label: 'Team',
    icon: (
      <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: (
      <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    key: 'fulfillment',
    label: 'Fulfillment',
    icon: (
      <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: (
      <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    key: 'rewards',
    label: 'Rewards',
    icon: (
      <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
      </svg>
    ),
  },
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function SettingsClient() {
  const [tab, setTab] = useState<Tab>('general');
  const [toastVisible, setToastVisible] = useState(false);

  function showToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-9">
        <div className="font-display italic text-sm text-camel mb-1.5">✦ Configuration</div>
        <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-tight mb-1">
          Shop <em className="italic text-oxblood">settings</em>
        </h1>
        <p className="text-sm text-muted tracking-[0.02em]">
          Manage your shop profile, team, payments, and integrations
        </p>
      </div>

      {/* Settings layout */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 items-start">

        {/* Settings nav */}
        <nav className="md:sticky md:top-25">
          <ul className="flex flex-row flex-wrap gap-1 md:flex-col md:gap-0.5">
            {MAIN_TABS.map(({ key, label, icon }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm w-full text-left transition-colors ${
                    tab === key
                      ? 'bg-ink text-cream'
                      : 'text-ink-soft hover:bg-paper hover:text-ink'
                  }`}
                >
                  <span className={tab === key ? 'opacity-100' : 'opacity-70'}>{icon}</span>
                  {label}
                </button>
              </li>
            ))}
            <li className="hidden md:block h-px bg-line-soft my-2.5" />
            <li>
              <button
                type="button"
                onClick={() => setTab('danger')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm w-full text-left transition-colors ${
                  tab === 'danger'
                    ? 'bg-ink text-cream'
                    : 'text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                <span className={`${tab === 'danger' ? 'opacity-100' : 'opacity-70'}`}>
                  <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                Danger zone
              </button>
            </li>
          </ul>
        </nav>

        {/* Panels */}
        <div>

          {/* ── General ─────────────────────────────────────── */}
          {tab === 'general' && (
            <div className="space-y-10">
              {/* Shop profile */}
              <section>
                <h2 className={sectionTitleCls}>
                  Shop <em className="italic text-oxblood font-normal">profile</em>
                </h2>
                <p className={sectionSubCls}>
                  Basic information about your shop. This appears on your storefront, receipts, and customer-facing emails.
                </p>
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

              {/* Shop address */}
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

              {/* Business hours */}
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
                    <label className={labelCls}>Default open</label>
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
                <button type="button" className={btnPrimary} onClick={showToast}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save changes
                </button>
                <button type="button" className={btnGhost}>Discard</button>
              </div>
            </div>
          )}

          {/* ── Team ────────────────────────────────────────── */}
          {tab === 'team' && (
            <div>
              <h2 className={sectionTitleCls}>
                Team <em className="italic text-oxblood font-normal">members</em>
              </h2>
              <p className={sectionSubCls}>
                Manage who has access to this dashboard and what they can do. Admin users can change settings and manage other users. Staff can view orders and update inventory.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  { initials: 'TD', name: 'Tangelo Doe', email: 'TANGELO@ELITECUTS.COM', role: 'Admin', avatarCls: 'bg-oxblood text-cream', pillCls: 'bg-red-soft text-oxblood' },
                  { initials: 'MR', name: 'Marcus Reyes', email: 'MARCUS@ELITECUTS.COM', role: 'Staff', avatarCls: 'bg-ink text-cream', pillCls: 'bg-ink/[0.06] text-ink-soft' },
                  { initials: 'EH', name: 'Elena Huang', email: 'ELENA@ELITECUTS.COM', role: 'Staff', avatarCls: 'bg-camel text-ink', pillCls: 'bg-ink/[0.06] text-ink-soft' },
                  { initials: 'SO', name: 'Sam Okafor', email: 'SAM@ELITECUTS.COM', role: 'Staff', avatarCls: 'bg-green text-cream', pillCls: 'bg-ink/[0.06] text-ink-soft' },
                  { initials: 'MP', name: 'Maya Park', email: 'MAYA@ELITECUTS.COM', role: 'View only', avatarCls: 'bg-camel-soft text-ink', pillCls: 'bg-green-soft text-green' },
                ].map((m) => (
                  <div
                    key={m.initials}
                    className="flex items-center gap-3.5 p-4 bg-paper border border-line-soft rounded-lg hover:border-line transition-colors"
                  >
                    <div className={`w-11 h-11 rounded-full grid place-items-center font-display font-semibold text-sm shrink-0 ${m.avatarCls}`}>
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{m.name}</div>
                      <div className="text-[11px] text-muted font-mono tracking-[0.04em]">{m.email}</div>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium shrink-0 ${m.pillCls}`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
              <button type="button" className={btnPrimary}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Invite team member
              </button>
            </div>
          )}

          {/* ── Payments ────────────────────────────────────── */}
          {tab === 'payments' && (
            <div className="space-y-10">
              <section>
                <h2 className={sectionTitleCls}>
                  Payment <em className="italic text-oxblood font-normal">providers</em>
                </h2>
                <p className={sectionSubCls}>
                  Connect your payment processors. Stripe is required for card payments. PayPal and Apple Pay are optional checkout methods.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { iconCls: 'bg-[#635BFF] text-white', iconLabel: 'S', name: 'Stripe', statusCls: 'text-green', status: 'CONNECTED · LIVE MODE', action: 'Configure', actionCls: btnGhost },
                    { iconCls: 'bg-[#003087] text-white', iconLabel: 'P', name: 'PayPal', statusCls: 'text-green', status: 'CONNECTED', action: 'Configure', actionCls: btnGhost },
                    { iconCls: 'bg-ink text-cream', iconLabel: '⌘', name: 'Apple Pay', statusCls: 'text-green', status: 'CONNECTED VIA STRIPE', action: 'Configure', actionCls: btnGhost },
                    { iconCls: 'bg-paper border border-line text-ink', iconLabel: 'G', name: 'Google Pay', statusCls: 'text-muted', status: 'NOT CONNECTED', action: 'Connect', actionCls: btnPrimary },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-4 p-5 bg-paper border border-line-soft rounded-lg hover:border-line transition-colors"
                    >
                      <div className={`w-11 h-11 rounded-lg grid place-items-center font-display font-bold text-base shrink-0 ${p.iconCls}`}>
                        {p.iconLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{p.name}</div>
                        <div className={`text-[11px] font-mono tracking-[0.04em] ${p.statusCls}`}>{p.status}</div>
                      </div>
                      <button type="button" className={`${p.actionCls} py-1.5! px-3.5! text-xs! shrink-0`}>
                        {p.action}
                      </button>
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
          )}

          {/* ── Fulfillment ──────────────────────────────────── */}
          {tab === 'fulfillment' && (
            <div className="space-y-10">
              <section>
                <h2 className={sectionTitleCls}>
                  Pickup <em className="italic text-oxblood font-normal">settings</em>
                </h2>
                <p className={sectionSubCls}>
                  Controls the time slots your customers see on the checkout page. Capacity per slot limits how many orders you can fulfill per hour.
                </p>
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
                    <label className={labelCls}>Max advance booking</label>
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
                  {[
                    { name: 'Zone 1 — Local', detail: '0–5 MI · SAME-DAY', price: 'Free', defaultOn: true, r: 3 },
                    { name: 'Zone 2 — Metro', detail: '5–15 MI · SAME-DAY', price: '$5.00', defaultOn: true, r: 6 },
                    { name: 'Zone 3 — Extended', detail: '15–25 MI · NEXT-DAY', price: '$8.00', defaultOn: true, r: 10 },
                  ].map((z) => (
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
                <button type="button" className={btnPrimary} onClick={showToast}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save changes
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ────────────────────────────────── */}
          {tab === 'notifications' && (
            <div>
              <h2 className={sectionTitleCls}>
                Email <em className="italic text-oxblood font-normal">notifications</em>
              </h2>
              <p className={sectionSubCls}>
                Control which emails are sent to you and your team. Customer-facing emails (order confirmation, pickup ready) are always sent.
              </p>
              <div className="flex flex-col">
                {[
                  { label: 'New order received', desc: 'Get notified when a customer places a new order', defaultOn: true },
                  { label: 'Low stock alerts', desc: 'When any item drops below reorder threshold', defaultOn: true },
                  { label: 'Daily summary', desc: 'Orders, revenue, and inventory at end of day', defaultOn: true },
                  { label: 'Weekly analytics report', desc: 'Revenue trends, top sellers, and customer insights', defaultOn: false },
                  { label: 'Aging room reminders', desc: 'Notifications when a cut reaches its target age', defaultOn: true },
                  { label: 'Customer churn alerts', desc: "When a customer hasn't ordered in 90+ days", defaultOn: false },
                ].map((n) => (
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
          )}

          {/* ── Rewards ─────────────────────────────────────── */}
          {tab === 'rewards' && (
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
                    <label className={labelCls}>Min redemption</label>
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
                    <label className={labelCls}>Connoisseur threshold</label>
                    <input type="number" defaultValue={250} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Master Cut threshold</label>
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
                <button type="button" className={btnPrimary} onClick={showToast}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save changes
                </button>
              </div>
            </div>
          )}

          {/* ── Danger zone ──────────────────────────────────── */}
          {tab === 'danger' && (
            <div className="border border-oxblood/25 rounded-lg p-6 bg-oxblood/3">
              <h2 className={`${sectionTitleCls} text-oxblood mb-5`}>
                Danger <em className="italic font-normal">zone</em>
              </h2>
              {[
                { label: 'Export all data', desc: 'Download a complete export of orders, customers, inventory, and analytics as CSV files.', action: 'Export all', cls: btnGhost },
                { label: 'Reset analytics', desc: 'Clear all analytics data and start tracking from scratch. Orders and customer records are preserved.', action: 'Reset analytics', cls: btnDanger },
                { label: 'Close shop temporarily', desc: 'Disables online ordering and hides the storefront. Your dashboard remains accessible.', action: 'Close shop', cls: btnDanger },
                { label: 'Delete everything', desc: 'Permanently delete your shop, all orders, customers, inventory, and analytics. This cannot be undone.', action: 'Delete shop', cls: btnDanger },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-3.5 border-b border-oxblood/10 last:border-0"
                >
                  <div>
                    <div className="font-display text-[15px] font-medium mb-0.5">{row.label}</div>
                    <div className="text-xs text-muted max-w-[40ch]">{row.desc}</div>
                  </div>
                  <button type="button" className={`${row.cls} shrink-0`}>
                    {row.action}
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      <SaveToast visible={toastVisible} />
    </>
  );
}
