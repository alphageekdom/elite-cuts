import CheckIcon from '@/components/uielements/CheckIcon';
import XIcon from '@/components/uielements/XIcon';

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
