function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green">
      <polyline points="4 12 10 18 20 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-oxblood">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function FieldValidationIcon({ show, valid }: { show: boolean; valid: boolean }) {
  if (!show) return null;
  return (
    <span className="absolute right-0 top-3 pointer-events-none">
      {valid ? <CheckIcon /> : <XIcon />}
    </span>
  );
}
