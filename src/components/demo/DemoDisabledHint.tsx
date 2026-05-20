// Small muted hint rendered next to a button that's disabled because the
// session is a demo account. Used under the four guarded self-serve actions
// on the profile (change info, change password, delete account, remove saved
// card). The hint is the real a11y surface — `title=` only fires on hover —
// so each call site renders it visibly below the button.

type Props = {
  show: boolean;
  // Caller controls vertical spacing since the four hosts have different
  // surrounding layouts (some sit in a flex row, some have their own pt).
  className?: string;
};

export default function DemoDisabledHint({ show, className = 'mt-2' }: Props) {
  if (!show) return null;
  return (
    <p className={`text-[12px] text-muted ${className}`}>
      Disabled in demo mode.
    </p>
  );
}
