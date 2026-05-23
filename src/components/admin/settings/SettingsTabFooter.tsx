import { btnPrimary, btnGhost } from '@/components/admin/AdminForm';

type Props = {
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

// Shared Save / Discard footer used by all three settings tabs. Lives here
// instead of in each tab so the disabled-on-clean and "No changes yet" hint
// behave the same across General, Notifications, and Rewards.
export default function SettingsTabFooter({ saving, dirty, onSave, onDiscard }: Props) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex gap-2">
        <button
          type="button"
          className={btnPrimary}
          onClick={onSave}
          disabled={saving || !dirty}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className={btnGhost}
          disabled={saving || !dirty}
        >
          Discard
        </button>
      </div>
      {!dirty && !saving && (
        <p className="text-[11px] text-muted">No changes yet</p>
      )}
    </div>
  );
}
