'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SaveToast } from './SettingsToast';
import GeneralTab from './tabs/GeneralTab';
import TeamTab from './tabs/TeamTab';
import PaymentsTab from './tabs/PaymentsTab';
import FulfillmentTab from './tabs/FulfillmentTab';
import NotificationsTab from './tabs/NotificationsTab';
import RewardsTab from './tabs/RewardsTab';
import DangerTab from './tabs/DangerTab';
import type { ShopSettings } from '@/models/ShopSettings';

type Tab = 'general' | 'team' | 'payments' | 'fulfillment' | 'notifications' | 'rewards' | 'danger';

const DEFAULTS: ShopSettings = {
  shopName: 'EliteCuts', tagline: 'Hand-cut meats, butchered fresh',
  description: 'Hand-cut meats, butchered fresh in San Diego.',
  phone: '(619) 555-0142', email: 'hello@elitecuts.com', website: 'https://elitecuts.com',
  street: '3045 30th Street', suite: '', city: 'San Diego', state: 'CA', zip: '92104',
  timezone: 'America/Los_Angeles (PT)', opensAt: '9:00 AM',
  slotsPerHour: 10, leadTime: '30 min', maxBookingWindow: 'Same day',
  zoneLocalEnabled: true, zoneMetroEnabled: true, zoneExtendedEnabled: true,
  notifNewOrder: true, notifLowStock: true, notifDailySummary: true,
  notifWeeklyAnalytics: false, notifAgingRoom: true, notifDormantCustomers: false,
  pointsPerDollar: 1, weekendMultiplier: '1× (none)', pointsExpiry: '6 months',
  redemptionRate: '100 pts = $5 off', minToRedeem: 0,
  connoisseurThreshold: 250, masterCutThreshold: 1000, tierReset: 'Never (lifetime)',
};

const MAIN_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: (<svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>) },
  { key: 'team', label: 'Team', icon: (<svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>) },
  { key: 'payments', label: 'Payments', icon: (<svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>) },
  { key: 'fulfillment', label: 'Fulfillment', icon: (<svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>) },
  { key: 'notifications', label: 'Notifications', icon: (<svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>) },
  { key: 'rewards', label: 'Rewards', icon: (<svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" /></svg>) },
];

export default function SettingsClient() {
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<ShopSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = useCallback((patch: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        toast.error('Failed to save settings');
        return;
      }
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2400);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const tabProps = { values: settings, onChange: handleChange, onSave: handleSave, saving };

  return (
    <>
      <div className="mb-9">
        <div className="font-display italic text-sm text-camel mb-1.5">Configuration</div>
        <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-tight mb-1">
          Shop <em className="italic text-oxblood">settings</em>
        </h1>
        <p className="text-sm text-muted tracking-[0.02em]">Shop profile, team access, payments, and fulfillment in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 items-start">
        <nav className="md:sticky md:top-25">
          <ul className="flex flex-row flex-wrap gap-1 md:flex-col md:gap-0.5">
            {MAIN_TABS.map(({ key, label, icon }) => (
              <li key={key}>
                <button type="button" onClick={() => setTab(key)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm w-full text-left transition-colors ${tab === key ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'}`}
                >
                  <span className={tab === key ? 'opacity-100' : 'opacity-70'}>{icon}</span>
                  {label}
                </button>
              </li>
            ))}
            <li className="hidden md:block h-px bg-line-soft my-2.5" />
            <li>
              <button type="button" onClick={() => setTab('danger')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm w-full text-left transition-colors ${tab === 'danger' ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'}`}
              >
                <span className={tab === 'danger' ? 'opacity-100' : 'opacity-70'}>
                  <svg className="w-3.75 h-3.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </span>
                Danger zone
              </button>
            </li>
          </ul>
        </nav>

        <div>
          {loading ? (
            <div className="py-16 text-center text-muted text-sm">Loading settings…</div>
          ) : (
            <>
              {tab === 'general'       && <GeneralTab {...tabProps} />}
              {tab === 'team'          && <TeamTab />}
              {tab === 'payments'      && <PaymentsTab />}
              {tab === 'fulfillment'   && <FulfillmentTab {...tabProps} />}
              {tab === 'notifications' && <NotificationsTab {...tabProps} />}
              {tab === 'rewards'       && <RewardsTab {...tabProps} />}
              {tab === 'danger'        && <DangerTab />}
            </>
          )}
        </div>
      </div>

      <SaveToast visible={toastVisible} />
    </>
  );
}
