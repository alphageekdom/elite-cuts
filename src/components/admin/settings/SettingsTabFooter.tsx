import { btnPrimary, btnGhost } from '@/components/admin/AdminForm';
import CheckIcon from '@/components/ui/icons/CheckIcon';

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
          <CheckIcon className="w-3 h-3" strokeWidth={2} />
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
