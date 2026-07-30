import CheckIcon from '@/components/ui/icons/CheckIcon';
import XIcon from '@/components/ui/icons/XIcon';

export function FieldValidationIcon({ show, valid }: { show: boolean; valid: boolean }) {
  if (!show) return null;
  return (
    <span className="absolute right-0 top-3 pointer-events-none">
      {valid ? (
        <CheckIcon className="h-4 w-4 text-green" />
      ) : (
        <XIcon className="h-4 w-4 text-oxblood" />
      )}
    </span>
  );
}
