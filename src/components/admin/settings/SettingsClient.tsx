'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import GeneralTab from './tabs/GeneralTab';
import NotificationsTab from './tabs/NotificationsTab';
import RewardsTab from './tabs/RewardsTab';
import type { ShopSettings } from '@/models/ShopSettings';
import { DEFAULT_SHOP_SETTINGS } from '@/lib/shopSettings/defaults';
import { shopSettingsInputSchema } from '@/lib/settings/schema';

type Tab = 'general' | 'notifications' | 'rewards';

const DEFAULTS: ShopSettings = DEFAULT_SHOP_SETTINGS;

const MAIN_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>) },
  { key: 'notifications', label: 'Notifications', icon: (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>) },
  { key: 'rewards', label: 'Rewards', icon: (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" /></svg>) },
];

export type SettingsTabProps = {
  values: ShopSettings;
  onChange: (patch: Partial<ShopSettings>) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
  dirty: boolean;
};

export default function SettingsClient() {
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<ShopSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Snapshot of the last successfully-saved doc. Drives the `dirty` memo +
  // the Discard handler — state (not ref) so the memo invalidates when a
  // save lands.
  const [savedSnapshot, setSavedSnapshot] = useState<ShopSettings>(DEFAULTS);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const merged = { ...DEFAULTS, ...data };
        setSettings(merged);
        setSavedSnapshot(merged);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = useCallback((patch: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Cheap deep-compare against the last-saved snapshot. The settings doc has
  // ~30 primitive fields so stringify is well within the no-noticeable-cost
  // band, and the dependency on `savedSnapshot` (not the ref) keeps this
  // honest when a save lands.
  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSnapshot),
    [settings, savedSnapshot],
  );

  async function handleSave() {
    // Pre-submit safeParse so admins see the first failing field-level
    // message via toast without a round trip. The PUT endpoint runs the
    // same schema as defence-in-depth.
    const parsed = shopSettingsInputSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please fix the form before saving');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = await res.json().catch(() => ({})) as { data?: Partial<ShopSettings>; message?: string };
      if (!res.ok) {
        toast.error(payload.message ?? 'Failed to save settings');
        return;
      }
      // Echo the server's settled doc back into local state so any
      // Mongo-side coercions (e.g. trimming) reflect immediately.
      const next = { ...DEFAULTS, ...payload.data };
      setSettings(next);
      setSavedSnapshot(next);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const onDiscard = useCallback(() => setSettings(savedSnapshot), [savedSnapshot]);
  const tabProps: SettingsTabProps = {
    values: settings,
    onChange: handleChange,
    onSave: handleSave,
    onDiscard,
    saving,
    dirty,
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Configuration"
        breadcrumb="Settings"
        title="Shop"
        titleAccent="settings"
        subtitle="Shop profile, notifications, and rewards in one place"
      />

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 items-start">
        <nav className="md:sticky md:top-25">
          {/* Phone widths get a 3-column grid so all three pills sit on one
              line at equal width. From md: up we fall back to the vertical
              sidebar list. */}
          <ul className="grid grid-cols-3 gap-1 md:flex md:flex-col md:gap-0.5">
            {MAIN_TABS.map(({ key, label, icon }) => (
              <li key={key}>
                <button type="button" onClick={() => setTab(key)}
                  className={`flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-2.5 rounded-lg text-sm w-full text-left transition-colors ${tab === key ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'}`}
                >
                  <span className={tab === key ? 'opacity-100' : 'opacity-70'}>{icon}</span>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {loading ? (
            <div className="py-16 text-center text-muted text-sm">Loading settings…</div>
          ) : (
            <>
              {tab === 'general'       && <GeneralTab {...tabProps} />}
              {tab === 'notifications' && <NotificationsTab {...tabProps} />}
              {tab === 'rewards'       && <RewardsTab {...tabProps} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
